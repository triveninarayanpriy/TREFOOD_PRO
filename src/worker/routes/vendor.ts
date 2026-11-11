import { Hono } from 'hono';
import { eq, and, gt, desc, inArray } from 'drizzle-orm';
import type { Env } from '../types';
import {
  orders,
  orderItems,
  orderEvents,
  vendors,
  gates,
  menuItems,
  menuCategories,
  auditLog,
} from '../db/schema';
import { requireAuth, requireRole } from '../middleware';
import { nextStatus, StatusTransitionError, type OrderStatus } from '../services/order';
import { getRequestNow, nowUtc } from '../utils/time';
import { ulid } from '../utils/ulid';
import {
  VendorRejectSchema,
  VendorStatusUpdateSchema,
  VendorMenuItemUpdateSchema,
  VendorOrderPrepAdjustSchema,
} from '@shared/schemas';
import { IST_OFFSET_SECONDS } from '@shared/curfew';
import { z } from 'zod';
import { dispatchWebPushForUser } from '../utils/webpush';

export const vendorRoutes = new Hono<{ Bindings: Env }>();

// All vendor routes require authentication and vendor/admin role
vendorRoutes.use('*', requireAuth, requireRole('vendor', 'admin'));

// Helper to resolve vendor ID for the request
function getVendorId(c: { get: (k: string) => unknown }): string | null {
  const user = c.get('user') as { role: string; vendorId?: string | null };
  return user?.vendorId || null;
}

// GET /api/vendor/orders?since=
vendorRoutes.get('/orders', async (c) => {
  const db = c.get('db');
  const vendorId = getVendorId(c);
  if (!vendorId) {
    return c.json({ error: { code: 'NO_VENDOR_ASSIGNED', message: 'No vendor assigned to this account.' } }, 403);
  }

  const sinceStr = c.req.query('since');
  const since = sinceStr ? parseInt(sinceStr, 10) : 0;

  const conditions = [eq(orders.vendorId, vendorId)];
  if (since > 0) {
    conditions.push(gt(orders.createdAt, since));
  }

  const [vendorRecord, activeGates, vendorOrderList] = await Promise.all([
    db.select().from(vendors).where(eq(vendors.id, vendorId)).get(),
    db.select().from(gates).where(eq(gates.active, true)).all(),
    db
      .select({
        order: orders,
        gate: gates,
      })
      .from(orders)
      .innerJoin(gates, eq(orders.gateId, gates.id))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(80)
      .all(),
  ]);

  let ordersWithItems: Array<typeof orders.$inferSelect & { gateName: string; gateCurfewTime: string; gateIs24x7: boolean; items: Array<typeof orderItems.$inferSelect> }> = [];
  if (vendorOrderList.length > 0) {
    const orderIds = vendorOrderList.map((r) => r.order.id);
    const batchedItems = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds))
      .all();

    const itemsByOrder = new Map<string, Array<typeof orderItems.$inferSelect>>();
    for (const item of batchedItems) {
      const list = itemsByOrder.get(item.orderId) || [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    ordersWithItems = vendorOrderList.map(({ order, gate }) => ({
      ...order,
      gateName: gate.name,
      gateCurfewTime: gate.curfewTime,
      gateIs24x7: gate.is24x7,
      items: itemsByOrder.get(order.id) || [],
    }));
  }

  return c.json({
    ok: true,
    orders: ordersWithItems,
    vendor: vendorRecord
      ? {
          id: vendorRecord.id,
          name: vendorRecord.name,
          isOpen: vendorRecord.isOpen,
          busyUntil: vendorRecord.busyUntil,
          prepMinutes: vendorRecord.prepMinutes,
          prepMaxMinutes: vendorRecord.prepMaxMinutes,
          nightSafe: vendorRecord.nightSafe,
        }
      : null,
    gates: activeGates,
    serverTime: nowUtc(),
  });
});

// PATCH /api/vendor/orders/:id/status
const UpdateOrderStatusSchema = z.object({
  status: z.enum(['accepted', 'out_for_delivery', 'at_gate', 'cancelled']),
  prepMinutes: z.number().int().positive().optional(),
  cancelReason: z.string().max(200).optional(),
});

async function transitionVendorOrder(params: {
  db: ReturnType<typeof import('../db').getDb>;
  env?: Env;
  ctx?: { waitUntil: (promise: Promise<unknown>) => void };
  user: { id: string; role: 'student' | 'vendor' | 'admin'; vendorId?: string | null };
  orderId: string;
  targetStatus: 'accepted' | 'out_for_delivery' | 'at_gate' | 'cancelled';
  prepMinutes?: number;
  cancelReason?: string;
}) {
  const { db, env, ctx, user, orderId, targetStatus, prepMinutes, cancelReason } = params;
  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) {
    return { error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }, httpStatus: 404 as const };
  }

  if (user.role === 'vendor' && order.vendorId !== user.vendorId) {
    return { error: { code: 'FORBIDDEN', message: 'You do not manage this order.' }, httpStatus: 403 as const };
  }

  try {
    nextStatus(order.status as OrderStatus, targetStatus as OrderStatus, user.role);
  } catch (err) {
    if (err instanceof StatusTransitionError) {
      return { error: { code: err.code, message: err.message }, httpStatus: err.status as 400 | 403 | 404 | 409 };
    }
    throw err;
  }

  const now = nowUtc();
  const updateData: Partial<typeof orders.$inferInsert> = {
    status: targetStatus,
  };

  if (targetStatus === 'accepted') {
    updateData.acceptedAt = now;
    if (prepMinutes) {
      updateData.etaAt = now + prepMinutes * 60;
    }
  } else if (targetStatus === 'out_for_delivery') {
    updateData.outForDeliveryAt = now;
  } else if (targetStatus === 'at_gate') {
    updateData.atGateAt = now;
  } else if (targetStatus === 'cancelled') {
    updateData.cancelledAt = now;
    updateData.cancelReason = cancelReason || 'Cancelled by vendor';
  }

  await db.update(orders).set(updateData).where(eq(orders.id, order.id));

  await db.insert(orderEvents).values({
    id: ulid(),
    orderId: order.id,
    status: targetStatus,
    actorId: user.id,
    at: now,
    note: cancelReason || `Status updated to ${targetStatus} by vendor`,
  });

  if (env) {
    const pushPromise = dispatchWebPushForUser({ db, env, userId: order.userId }).catch(() => undefined);
    if (ctx) {
      ctx.waitUntil(pushPromise);
    } else {
      await pushPromise;
    }
  }

  return { ok: true as const, status: targetStatus, updatedAt: now };
}

vendorRoutes.patch('/orders/:id/status', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parseResult = UpdateOrderStatusSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: parseResult.error.errors[0]?.message || 'Invalid status' } },
      400
    );
  }

  let execCtx: { waitUntil: (promise: Promise<unknown>) => void } | undefined;
  try {
    execCtx = c.executionCtx;
  } catch {
    execCtx = undefined;
  }

  const result = await transitionVendorOrder({
    db: c.get('db'),
    env: c.env,
    ctx: execCtx,
    user: c.get('user')!,
    orderId: c.req.param('id'),
    targetStatus: parseResult.data.status,
    prepMinutes: parseResult.data.prepMinutes,
    cancelReason: parseResult.data.cancelReason,
  });

  if ('error' in result) return c.json({ error: result.error }, result.httpStatus);
  return c.json(result);
});

// POST /api/vendor/orders/:id/accept
vendorRoutes.post('/orders/:id/accept', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { prepMinutes?: number };
  const prepMinutes = typeof body.prepMinutes === 'number' && body.prepMinutes > 0 ? body.prepMinutes : undefined;
  let execCtx: { waitUntil: (promise: Promise<unknown>) => void } | undefined;
  try {
    execCtx = c.executionCtx;
  } catch {
    execCtx = undefined;
  }
  const result = await transitionVendorOrder({
    db: c.get('db'),
    env: c.env,
    ctx: execCtx,
    user: c.get('user')!,
    orderId: c.req.param('id'),
    targetStatus: 'accepted',
    prepMinutes,
  });
  if ('error' in result) return c.json({ error: result.error }, result.httpStatus);
  return c.json(result);
});

// POST /api/vendor/orders/:id/reject (with required reason)
vendorRoutes.post('/orders/:id/reject', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = VendorRejectSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message || 'Reason required' } },
      400
    );
  }
  let execCtx: { waitUntil: (promise: Promise<unknown>) => void } | undefined;
  try {
    execCtx = c.executionCtx;
  } catch {
    execCtx = undefined;
  }
  const result = await transitionVendorOrder({
    db: c.get('db'),
    env: c.env,
    ctx: execCtx,
    user: c.get('user')!,
    orderId: c.req.param('id'),
    targetStatus: 'cancelled',
    cancelReason: parsed.data.reason,
  });
  if ('error' in result) return c.json({ error: result.error }, result.httpStatus);
  return c.json(result);
});

// POST /api/vendor/orders/:id/ready (mark out_for_delivery -> ready for dispatch/gate)
vendorRoutes.post('/orders/:id/ready', async (c) => {
  let execCtx: { waitUntil: (promise: Promise<unknown>) => void } | undefined;
  try {
    execCtx = c.executionCtx;
  } catch {
    execCtx = undefined;
  }
  const result = await transitionVendorOrder({
    db: c.get('db'),
    env: c.env,
    ctx: execCtx,
    user: c.get('user')!,
    orderId: c.req.param('id'),
    targetStatus: 'out_for_delivery',
  });
  if ('error' in result) return c.json({ error: result.error }, result.httpStatus);
  return c.json(result);
});

// POST /api/vendor/orders/:id/handover-assist (unlock locked handover or mark handed over with audit log)
vendorRoutes.post('/orders/:id/handover-assist', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const vendorId = getVendorId(c);
  const orderId = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as { note?: string; completeDelivery?: boolean };

  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) {
    return c.json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } }, 404);
  }
  if (user.role === 'vendor' && order.vendorId !== vendorId) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'You do not manage this order.' } }, 403);
  }

  const now = nowUtc();
  const complete = Boolean(body.completeDelivery);
  if (complete && order.status === 'at_gate') {
    await db
      .update(orders)
      .set({ codeAttempts: 0, status: 'delivered', deliveredAt: now, paymentStatus: 'paid' })
      .where(eq(orders.id, order.id));
  } else {
    await db.update(orders).set({ codeAttempts: 0 }).where(eq(orders.id, order.id));
  }

  await db.insert(orderEvents).values({
    id: ulid(),
    orderId: order.id,
    status: complete && order.status === 'at_gate' ? 'delivered' : order.status,
    actorId: user.id,
    at: now,
    note: body.note || 'Vendor assisted student handover verification',
  });

  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: 'VENDOR_HANDOVER_ASSIST',
    targetType: 'orders',
    targetId: order.id,
    detailsJson: JSON.stringify({ complete, previousAttempts: order.codeAttempts }),
    at: now,
  });

  return c.json({
    ok: true,
    orderId: order.id,
    status: complete && order.status === 'at_gate' ? 'delivered' : order.status,
    codeAttempts: 0,
  });
});

// PATCH /api/vendor/orders/:id/prep-time (Adjust ETA / prep time on an active order)
vendorRoutes.patch('/orders/:id/prep-time', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const vendorId = getVendorId(c);
  const orderId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = VendorOrderPrepAdjustSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: 'Prep time must be between 5 and 120 minutes.' } },
      400
    );
  }

  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) {
    return c.json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } }, 404);
  }
  if (user.role === 'vendor' && order.vendorId !== vendorId) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'You do not manage this order.' } }, 403);
  }

  const now = nowUtc();
  const baseTime = order.acceptedAt || order.placedAt || now;
  const newEtaAt = Math.max(now + 60, baseTime + parsed.data.prepMinutes * 60);

  await db.update(orders).set({ etaAt: newEtaAt }).where(eq(orders.id, order.id));
  await db.insert(orderEvents).values({
    id: ulid(),
    orderId: order.id,
    status: order.status,
    actorId: user.id,
    at: now,
    note: `Prep time adjusted to ${parsed.data.prepMinutes} mins by vendor`,
  });

  return c.json({ ok: true, orderId: order.id, etaAt: newEtaAt, prepMinutes: parsed.data.prepMinutes });
});

// PATCH /api/vendor/prep-time
const UpdatePrepTimeSchema = z.object({
  prepMinutes: z.number().int().min(5).max(90),
  prepMaxMinutes: z.number().int().min(5).max(120).optional(),
});

vendorRoutes.patch('/prep-time', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const vendorId = getVendorId(c);
  if (!vendorId) {
    return c.json({ error: { code: 'NO_VENDOR_ASSIGNED', message: 'No vendor assigned.' } }, 403);
  }
  const body = await c.req.json().catch(() => ({}));
  const parsed = UpdatePrepTimeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid prep time (5-90 mins)' } }, 400);
  }

  await db
    .update(vendors)
    .set({
      prepMinutes: parsed.data.prepMinutes,
      prepMaxMinutes: parsed.data.prepMaxMinutes || parsed.data.prepMinutes + 10,
    })
    .where(eq(vendors.id, vendorId));

  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: 'VENDOR_PREP_TIME_UPDATED',
    targetType: 'vendors',
    targetId: vendorId,
    detailsJson: JSON.stringify({ prepMinutes: parsed.data.prepMinutes }),
    at: nowUtc(),
  });

  const updated = await db.select().from(vendors).where(eq(vendors.id, vendorId)).get();
  return c.json({ ok: true, vendor: updated });
});

// GET /api/vendor/menu
vendorRoutes.get('/menu', async (c) => {
  const db = c.get('db');
  const vendorId = getVendorId(c);
  if (!vendorId) {
    return c.json({ error: { code: 'NO_VENDOR_ASSIGNED', message: 'No vendor assigned.' } }, 403);
  }

  const [vendorRecord, categories, items] = await Promise.all([
    db.select().from(vendors).where(eq(vendors.id, vendorId)).get(),
    db.select().from(menuCategories).where(eq(menuCategories.vendorId, vendorId)).all(),
    db.select().from(menuItems).where(eq(menuItems.vendorId, vendorId)).all(),
  ]);

  return c.json({ ok: true, vendor: vendorRecord || null, categories, items });
});

// PATCH /api/vendor/menu/item/:id/stock (One-tap stock toggle)
vendorRoutes.patch('/menu/item/:id/stock', async (c) => {
  const db = c.get('db');
  const vendorId = getVendorId(c);
  const itemId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  if (typeof body.inStock !== 'boolean') {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'inStock must be a boolean' } }, 400);
  }

  const item = await db.select().from(menuItems).where(eq(menuItems.id, itemId)).get();
  if (!item || item.vendorId !== vendorId) {
    return c.json({ error: { code: 'ITEM_NOT_FOUND', message: 'Item not found' } }, 404);
  }

  await db.update(menuItems).set({ inStock: body.inStock }).where(eq(menuItems.id, itemId));

  return c.json({ ok: true, id: itemId, inStock: body.inStock });
});

// PATCH /api/vendor/menu/item/:id (Update item price, packing charge, or stock)
vendorRoutes.patch('/menu/item/:id', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const vendorId = getVendorId(c);
  const itemId = c.req.param('id');
  if (!vendorId) {
    return c.json({ error: { code: 'NO_VENDOR_ASSIGNED', message: 'No vendor assigned.' } }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = VendorMenuItemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message || 'Invalid item update' } },
      400
    );
  }

  const item = await db.select().from(menuItems).where(eq(menuItems.id, itemId)).get();
  if (!item || item.vendorId !== vendorId) {
    return c.json({ error: { code: 'ITEM_NOT_FOUND', message: 'Item not found' } }, 404);
  }

  const updateFields: Partial<typeof menuItems.$inferInsert> = {};
  if (parsed.data.pricePaise !== undefined) updateFields.pricePaise = parsed.data.pricePaise;
  if (parsed.data.inStock !== undefined) updateFields.inStock = parsed.data.inStock;
  if (parsed.data.packingChargePaise !== undefined) {
    updateFields.packingChargePaise = parsed.data.packingChargePaise;
  }

  if (Object.keys(updateFields).length > 0) {
    await db.update(menuItems).set(updateFields).where(eq(menuItems.id, itemId));
    await db.insert(auditLog).values({
      id: ulid(),
      actorId: user.id,
      action: 'VENDOR_MENU_ITEM_UPDATED',
      targetType: 'menu_items',
      targetId: itemId,
      detailsJson: JSON.stringify(updateFields),
      at: nowUtc(),
    });
  }

  const updated = await db.select().from(menuItems).where(eq(menuItems.id, itemId)).get();
  return c.json({ ok: true, item: updated });
});

// PATCH /api/vendor/status (Toggle open, busy mode, or night-safety staff duty)
vendorRoutes.patch('/status', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const vendorId = getVendorId(c);
  if (!vendorId) {
    return c.json({ error: { code: 'NO_VENDOR_ASSIGNED', message: 'No vendor assigned.' } }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const parseResult = VendorStatusUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid vendor status options' } }, 400);
  }

  const { isOpen, busyMinutes, nightSafe } = parseResult.data;
  const now = nowUtc();
  const updateData: Partial<typeof vendors.$inferInsert> = {};

  if (isOpen !== undefined) {
    updateData.isOpen = isOpen;
  }

  if (busyMinutes !== undefined) {
    updateData.busyUntil = busyMinutes > 0 ? now + busyMinutes * 60 : null;
  }

  if (nightSafe !== undefined) {
    updateData.nightSafe = nightSafe;
  }

  if (Object.keys(updateData).length > 0) {
    await db.update(vendors).set(updateData).where(eq(vendors.id, vendorId));
    await db.insert(auditLog).values({
      id: ulid(),
      actorId: user.id,
      action: 'VENDOR_STATUS_UPDATED',
      targetType: 'vendors',
      targetId: vendorId,
      detailsJson: JSON.stringify(updateData),
      at: now,
    });
  }

  const updated = await db.select().from(vendors).where(eq(vendors.id, vendorId)).get();
  return c.json({ ok: true, vendor: updated });
});

// GET /api/vendor/settlement (Daily settlement + vendor insights)
vendorRoutes.get('/settlement', async (c) => {
  const db = c.get('db');
  const vendorId = getVendorId(c);
  if (!vendorId) {
    return c.json({ error: { code: 'NO_VENDOR_ASSIGNED', message: 'No vendor assigned.' } }, 403);
  }

  const [vendorRecord, allVendorOrders] = await Promise.all([
    db.select().from(vendors).where(eq(vendors.id, vendorId)).get(),
    db
      .select()
      .from(orders)
      .where(eq(orders.vendorId, vendorId))
      .orderBy(desc(orders.createdAt))
      .limit(200)
      .all(),
  ]);

  const now = getRequestNow(c);
  // Start of current IST day in UTC seconds
  const istNowSec = now + IST_OFFSET_SECONDS;
  const istStartOfDaySec = istNowSec - (istNowSec % 86400);
  const utcStartOfIstDay = istStartOfDaySec - IST_OFFSET_SECONDS;

  const todayOrders = allVendorOrders.filter(
    (o) => o.createdAt >= utcStartOfIstDay && o.status !== 'cancelled' && o.status !== 'expired'
  );
  const deliveredOrders = allVendorOrders.filter((o) => o.status === 'delivered');
  const todayDelivered = deliveredOrders.filter((o) => (o.deliveredAt || o.createdAt) >= utcStartOfIstDay);

  const totalCollectedPaise = deliveredOrders.reduce((sum, o) => sum + o.totalPaise, 0);
  const totalDeliveredCount = deliveredOrders.length;
  const todayRevenuePaise = todayOrders.reduce((sum, o) => sum + o.totalPaise, 0);
  const payAtGatePaise = todayOrders
    .filter((o) => o.paymentMethod !== 'upi_simulated')
    .reduce((sum, o) => sum + o.totalPaise, 0);
  const upiPaise = todayOrders
    .filter((o) => o.paymentMethod === 'upi_simulated')
    .reduce((sum, o) => sum + o.totalPaise, 0);

  // Average prep duration vs promised (for orders dispatched/at_gate/delivered)
  const prepSamples = allVendorOrders
    .map((o) => {
      const start = o.acceptedAt || o.placedAt;
      const end = o.outForDeliveryAt || o.atGateAt || o.deliveredAt;
      if (!start || !end || end < start) return null;
      return Math.max(1, Math.round((end - start) / 60));
    })
    .filter((m): m is number => m !== null && m <= 120);

  const avgPrepMinutes =
    prepSamples.length > 0
      ? Math.round(prepSamples.reduce((s, m) => s + m, 0) / prepSamples.length)
      : vendorRecord?.prepMinutes || 15;

  // Peak hours IST histogram in 2-hour buckets matching 00h..22h (or full 12 buckets)
  const hourlyBuckets = Array.from({ length: 12 }, (_, idx) => ({
    label: `${(idx * 2).toString().padStart(2, '0')}h`,
    count: 0,
  }));
  for (const o of allVendorOrders) {
    if (o.status === 'cancelled' || o.status === 'expired') continue;
    const istHour = new Date((o.createdAt + IST_OFFSET_SECONDS) * 1000).getUTCHours();
    const bucketIdx = Math.min(11, Math.floor(istHour / 2));
    hourlyBuckets[bucketIdx].count += 1;
  }

  // Batched Top Selling Items across non-cancelled vendor orders
  const nonCancelledIds = allVendorOrders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'expired')
    .map((o) => o.id);

  let topItems: Array<{ itemId: string; name: string; quantity: number; revenuePaise: number }> = [];
  if (nonCancelledIds.length > 0) {
    const soldLines = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, nonCancelledIds))
      .all();

    const itemStats = new Map<
      string,
      { itemId: string; name: string; quantity: number; revenuePaise: number }
    >();
    for (const line of soldLines) {
      const existing = itemStats.get(line.itemId) || {
        itemId: line.itemId,
        name: line.name,
        quantity: 0,
        revenuePaise: 0,
      };
      existing.quantity += line.quantity;
      existing.revenuePaise += line.pricePaise * line.quantity;
      itemStats.set(line.itemId, existing);
    }

    topItems = Array.from(itemStats.values())
      .sort((a, b) => b.quantity - a.quantity || b.revenuePaise - a.revenuePaise)
      .slice(0, 5);
  }

  return c.json({
    ok: true,
    totalDeliveredCount,
    totalCollectedPaise,
    totalCollectedRupees: totalCollectedPaise / 100,
    insights: {
      todayOrdersCount: todayOrders.length,
      todayDeliveredCount: todayDelivered.length,
      todayRevenuePaise,
      payAtGatePaise,
      upiPaise,
      avgPrepMinutes,
      promisedPrepMinutes: vendorRecord?.prepMinutes || 15,
      prepSamplesCount: prepSamples.length,
      topItems,
      hourlyBuckets,
    },
    orders: deliveredOrders.map((o) => ({
      id: o.id,
      publicNo: o.publicNo,
      totalPaise: o.totalPaise,
      paymentMethod: o.paymentMethod,
      deliveredAt: o.deliveredAt,
      handoverCode: o.handoverCode,
    })),
  });
});
