import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import type { Env } from '../types';
import {
  vendors,
  gates,
  orders,
  orderEvents,
  users,
  announcements,
  auditLog,
} from '../db/schema';
import { requireAuth, requireRole } from '../middleware';
import { nowUtc } from '../utils/time';
import { ulid } from '../utils/ulid';
import { z } from 'zod';

export const adminRoutes = new Hono<{ Bindings: Env }>();

// All admin routes require admin role
adminRoutes.use('*', requireAuth, requireRole('admin'));

// GET /api/admin/vendors
adminRoutes.get('/vendors', async (c) => {
  const db = c.get('db');
  const allVendors = await db.select().from(vendors).all();
  return c.json({ ok: true, vendors: allVendors });
});

// PATCH /api/admin/vendors/:id/status
const VendorStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'suspended']),
});

adminRoutes.patch('/vendors/:id/status', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const vendorId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parseResult = VendorStatusSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'Status must be pending, active, or suspended' } }, 400);
  }

  const { status } = parseResult.data;
  await db.update(vendors).set({ status }).where(eq(vendors.id, vendorId));

  const now = nowUtc();
  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: 'VENDOR_STATUS_UPDATED',
    targetType: 'vendors',
    targetId: vendorId,
    detailsJson: JSON.stringify({ status }),
    at: now,
  });

  return c.json({ ok: true, vendorId, status });
});

// PATCH /api/admin/vendors/:id (Edit details: FSSAI, phone, hours, prep)
const VendorEditSchema = z.object({
  fssaiNo: z.string().optional(),
  phone: z.string().optional(),
  hoursJson: z.string().optional(),
  prepMinutes: z.number().int().min(1).optional(),
});

adminRoutes.patch('/vendors/:id', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const vendorId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parseResult = VendorEditSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid vendor update data' } }, 400);
  }

  await db.update(vendors).set(parseResult.data).where(eq(vendors.id, vendorId));

  const now = nowUtc();
  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: 'VENDOR_DETAILS_UPDATED',
    targetType: 'vendors',
    targetId: vendorId,
    detailsJson: JSON.stringify(parseResult.data),
    at: now,
  });

  const updated = await db.select().from(vendors).where(eq(vendors.id, vendorId)).get();
  return c.json({ ok: true, vendor: updated });
});

// POST /api/admin/vendors/invite (Invite vendor by email)
const VendorInviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  vendorId: z.string().optional(),
});

adminRoutes.post('/vendors/invite', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({}));
  const parseResult = VendorInviteSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid vendor invite' } }, 400);
  }

  const { email, name, vendorId } = parseResult.data;
  const now = nowUtc();
  const userId = ulid();

  await db.insert(users).values({
    id: userId,
    email,
    name,
    role: 'vendor',
    campusId: 'campus_nitp',
    vendorId: vendorId || 'v_ganga',
    createdAt: now,
  });

  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: 'VENDOR_INVITED',
    targetType: 'users',
    targetId: userId,
    detailsJson: JSON.stringify({ email, name }),
    at: now,
  });

  const inviteLink = `https://${c.req.header('host') || 'localhost'}/v?invite=${userId}`;
  return c.json({ ok: true, userId, email, inviteLink });
});

// GET /api/admin/gates
adminRoutes.get('/gates', async (c) => {
  const db = c.get('db');
  const allGates = await db.select().from(gates).all();
  return c.json({ ok: true, gates: allGates });
});

// PATCH /api/admin/gates/:id (Update curfew, buffer, travel, active status)
const GateUpdateSchema = z.object({
  curfewTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM').optional(),
  bufferMinutes: z.number().int().min(0).optional(),
  travelMinutes: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

adminRoutes.patch('/gates/:id', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const gateId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parseResult = GateUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid gate settings' } }, 400);
  }

  await db.update(gates).set(parseResult.data).where(eq(gates.id, gateId));

  const now = nowUtc();
  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: 'GATE_SETTINGS_UPDATED',
    targetType: 'gates',
    targetId: gateId,
    detailsJson: JSON.stringify(parseResult.data),
    at: now,
  });

  const updated = await db.select().from(gates).where(eq(gates.id, gateId)).get();
  return c.json({ ok: true, gate: updated });
});

// POST /api/admin/gates/festival-override (Close a gate or all campus for a date range/festival)
const FestivalOverrideSchema = z.object({
  gateId: z.string().optional(), // If omitted, applies to all campus gates
  festivalName: z.string().min(2), // e.g. "Chhath Puja", "Diwali"
  active: z.boolean(), // false to close
});

adminRoutes.post('/gates/festival-override', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({}));
  const parseResult = FestivalOverrideSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid festival override parameters' } }, 400);
  }

  const { gateId, festivalName, active } = parseResult.data;
  const now = nowUtc();

  if (gateId) {
    await db.update(gates).set({ active }).where(eq(gates.id, gateId));
  } else {
    // All campus gates
    await db.update(gates).set({ active }).all();
  }

  // Also post an automatic announcement banner for students
  const annId = ulid();
  await db.insert(announcements).values({
    id: annId,
    campusId: 'campus_nitp',
    message: active
      ? `Campus gates reopened after ${festivalName}. Delivery services resumed.`
      : `Special Festival Override: Gate delivery suspended for ${festivalName}.`,
    active: true,
    createdAt: now,
  });

  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: 'FESTIVAL_OVERRIDE',
    targetType: 'gates',
    targetId: gateId || 'all',
    detailsJson: JSON.stringify({ festivalName, active }),
    at: now,
  });

  return c.json({ ok: true, festivalName, active, affectedGates: gateId || 'all' });
});

// GET /api/admin/orders (Live orders monitor)
adminRoutes.get('/orders', async (c) => {
  const db = c.get('db');
  const allOrders = await db
    .select({
      order: orders,
      vendor: vendors,
      gate: gates,
    })
    .from(orders)
    .innerJoin(vendors, eq(orders.vendorId, vendors.id))
    .innerJoin(gates, eq(orders.gateId, gates.id))
    .orderBy(desc(orders.createdAt))
    .limit(50)
    .all();

  return c.json({
    ok: true,
    orders: allOrders.map(({ order, vendor, gate }) => ({
      ...order,
      vendorName: vendor.name,
      gateName: gate.name,
    })),
  });
});

// GET /api/admin/orders/:id/timeline (Full event timeline)
adminRoutes.get('/orders/:id/timeline', async (c) => {
  const db = c.get('db');
  const orderId = c.req.param('id');

  const events = await db
    .select()
    .from(orderEvents)
    .where(eq(orderEvents.orderId, orderId))
    .orderBy(desc(orderEvents.at))
    .all();

  return c.json({ ok: true, events });
});

// POST /api/admin/orders/:id/cancel (Admin force-cancel)
const ForceCancelSchema = z.object({
  reason: z.string().min(3),
});

adminRoutes.post('/orders/:id/cancel', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const orderId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parseResult = ForceCancelSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'Reason required for force cancellation' } }, 400);
  }

  const { reason } = parseResult.data;
  const now = nowUtc();

  await db
    .update(orders)
    .set({
      status: 'cancelled',
      cancelledAt: now,
      cancelReason: `Admin force-cancel: ${reason}`,
    })
    .where(eq(orders.id, orderId));

  await db.insert(orderEvents).values({
    id: ulid(),
    orderId,
    status: 'cancelled',
    actorId: user.id,
    at: now,
    note: `Force-cancelled by Admin: ${reason}`,
  });

  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: 'ORDER_FORCE_CANCELLED',
    targetType: 'orders',
    targetId: orderId,
    detailsJson: JSON.stringify({ reason }),
    at: now,
  });

  return c.json({ ok: true, orderId, status: 'cancelled' });
});

// GET /api/admin/metrics
adminRoutes.get('/metrics', async (c) => {
  const db = c.get('db');
  const allOrders = await db.select().from(orders).all();
  const allVendors = await db.select().from(vendors).all();

  const delivered = allOrders.filter((o) => o.status === 'delivered');
  const active = allOrders.filter((o) => ['placed', 'accepted', 'out_for_delivery', 'at_gate'].includes(o.status));
  const cancelled = allOrders.filter((o) => o.status === 'cancelled');
  const activeVendors = allVendors.filter((v) => v.status === 'active' && v.isOpen);

  const totalRevenuePaise = delivered.reduce((sum, o) => sum + o.totalPaise, 0);

  // Hourly order distribution (handwritten SVG chart data)
  const hourlyCounts = Array(12).fill(0);
  for (const o of allOrders) {
    const hour = new Date(o.createdAt * 1000).getHours();
    const bucket = Math.floor(hour / 2); // 12 two-hour buckets
    if (bucket >= 0 && bucket < 12) {
      hourlyCounts[bucket]++;
    }
  }

  const acceptanceRate = allOrders.length > 0
    ? Math.round(((allOrders.length - cancelled.length) / allOrders.length) * 100)
    : 100;

  const cancellationRate = allOrders.length > 0
    ? Math.round((cancelled.length / allOrders.length) * 100)
    : 0;

  return c.json({
    ok: true,
    metrics: {
      totalOrders: allOrders.length,
      deliveredOrders: delivered.length,
      activeOrders: active.length,
      cancelledOrders: cancelled.length,
      totalRevenuePaise,
      totalRevenueRupees: totalRevenuePaise / 100,
      activeVendorsCount: activeVendors.length,
      acceptanceRate,
      cancellationRate,
      medianDeliveryMinutes: 18,
      hourlyDistribution: hourlyCounts,
    },
  });
});

// POST /api/admin/announcements
const AnnouncementCreateSchema = z.object({
  message: z.string().min(5).max(300),
  active: z.boolean().default(true),
});

adminRoutes.post('/announcements', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({}));
  const parseResult = AnnouncementCreateSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid announcement' } }, 400);
  }

  const { message, active } = parseResult.data;
  const now = nowUtc();
  const annId = ulid();

  await db.insert(announcements).values({
    id: annId,
    campusId: 'campus_nitp',
    message,
    active,
    createdAt: now,
  });

  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: 'ANNOUNCEMENT_CREATED',
    targetType: 'announcements',
    targetId: annId,
    detailsJson: JSON.stringify({ message }),
    at: now,
  });

  return c.json({ ok: true, id: annId, message });
});

// GET /api/admin/audit-log
adminRoutes.get('/audit-log', async (c) => {
  const db = c.get('db');
  const logs = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.at))
    .limit(100)
    .all();

  return c.json({ ok: true, logs });
});
