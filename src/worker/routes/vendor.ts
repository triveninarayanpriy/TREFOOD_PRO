import { Hono } from 'hono';
import { eq, and, gt, desc } from 'drizzle-orm';
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
import { nowUtc } from '../utils/time';
import { ulid } from '../utils/ulid';
import { VendorRejectSchema } from '@shared/schemas';
import { z } from 'zod';

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

  const vendorOrderList = await db
    .select({
      order: orders,
      gate: gates,
    })
    .from(orders)
    .innerJoin(gates, eq(orders.gateId, gates.id))
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .all();

  // Load items for each order
  const ordersWithItems = await Promise.all(
    vendorOrderList.map(async ({ order, gate }) => {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).all();
      return {
        ...order,
        gateName: gate.name,
        items,
      };
    })
  );

  return c.json({ ok: true, orders: ordersWithItems, serverTime: nowUtc() });
});

// PATCH /api/vendor/orders/:id/status
const UpdateOrderStatusSchema = z.object({
  status: z.enum(['accepted', 'out_for_delivery', 'at_gate', 'cancelled']),
  prepMinutes: z.number().int().positive().optional(),
  cancelReason: z.string().max(200).optional(),
});

async function transitionVendorOrder(params: {
  db: ReturnType<typeof import('../db').getDb>;
  user: { id: string; role: 'student' | 'vendor' | 'admin'; vendorId?: string | null };
  orderId: string;
  targetStatus: 'accepted' | 'out_for_delivery' | 'at_gate' | 'cancelled';
  prepMinutes?: number;
  cancelReason?: string;
}) {
  const { db, user, orderId, targetStatus, prepMinutes, cancelReason } = params;
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

  const result = await transitionVendorOrder({
    db: c.get('db'),
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
  const result = await transitionVendorOrder({
    db: c.get('db'),
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
  const result = await transitionVendorOrder({
    db: c.get('db'),
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
  const result = await transitionVendorOrder({
    db: c.get('db'),
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

// PATCH /api/vendor/prep-time
const UpdatePrepTimeSchema = z.object({
  prepMinutes: z.number().int().min(5).max(90),
  prepMaxMinutes: z.number().int().min(5).max(120).optional(),
});

vendorRoutes.patch('/prep-time', async (c) => {
  const db = c.get('db');
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

  const categories = await db
    .select()
    .from(menuCategories)
    .where(eq(menuCategories.vendorId, vendorId))
    .all();

  const items = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.vendorId, vendorId))
    .all();

  return c.json({ ok: true, categories, items });
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

// PATCH /api/vendor/status (Toggle open or busy)
const VendorStatusToggleSchema = z.object({
  isOpen: z.boolean().optional(),
  busyMinutes: z.number().int().nonnegative().optional(), // e.g. 15, 30, 0 to clear
});

vendorRoutes.patch('/status', async (c) => {
  const db = c.get('db');
  const vendorId = getVendorId(c);
  if (!vendorId) {
    return c.json({ error: { code: 'NO_VENDOR_ASSIGNED', message: 'No vendor assigned.' } }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const parseResult = VendorStatusToggleSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid vendor status options' } }, 400);
  }

  const { isOpen, busyMinutes } = parseResult.data;
  const now = nowUtc();
  const updateData: Partial<typeof vendors.$inferInsert> = {};

  if (isOpen !== undefined) {
    updateData.isOpen = isOpen;
  }

  if (busyMinutes !== undefined) {
    updateData.busyUntil = busyMinutes > 0 ? now + busyMinutes * 60 : null;
  }

  await db.update(vendors).set(updateData).where(eq(vendors.id, vendorId));

  const updated = await db.select().from(vendors).where(eq(vendors.id, vendorId)).get();
  return c.json({ ok: true, vendor: updated });
});

// GET /api/vendor/settlement (Summary of delivered orders and collected amounts)
vendorRoutes.get('/settlement', async (c) => {
  const db = c.get('db');
  const vendorId = getVendorId(c);
  if (!vendorId) {
    return c.json({ error: { code: 'NO_VENDOR_ASSIGNED', message: 'No vendor assigned.' } }, 403);
  }

  const deliveredOrders = await db
    .select()
    .from(orders)
    .where(and(eq(orders.vendorId, vendorId), eq(orders.status, 'delivered')))
    .all();

  const totalCollectedPaise = deliveredOrders.reduce((sum, o) => sum + o.totalPaise, 0);
  const totalDeliveredCount = deliveredOrders.length;

  return c.json({
    ok: true,
    totalDeliveredCount,
    totalCollectedPaise,
    totalCollectedRupees: totalCollectedPaise / 100,
    orders: deliveredOrders.map((o) => ({
      id: o.id,
      publicNo: o.publicNo,
      totalPaise: o.totalPaise,
      deliveredAt: o.deliveredAt,
      handoverCode: o.handoverCode,
    })),
  });
});
