import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import type { Env } from '../types';
import {
  vendors,
  gates,
  orders,
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

// GET /api/admin/metrics
adminRoutes.get('/metrics', async (c) => {
  const db = c.get('db');
  const allOrders = await db.select().from(orders).all();

  const delivered = allOrders.filter((o) => o.status === 'delivered');
  const active = allOrders.filter((o) => ['placed', 'accepted', 'out_for_delivery', 'at_gate'].includes(o.status));
  const cancelled = allOrders.filter((o) => o.status === 'cancelled');

  const totalRevenuePaise = delivered.reduce((sum, o) => sum + o.totalPaise, 0);

  return c.json({
    ok: true,
    metrics: {
      totalOrders: allOrders.length,
      deliveredOrders: delivered.length,
      activeOrders: active.length,
      cancelledOrders: cancelled.length,
      totalRevenuePaise,
      totalRevenueRupees: totalRevenuePaise / 100,
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
