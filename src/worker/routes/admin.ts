import { Hono } from 'hono';
import { eq, desc, sql } from 'drizzle-orm';
import type { Env } from '../types';
import {
  vendors,
  vendorGates,
  vendorApplications,
  gates,
  orders,
  orderEvents,
  users,
  announcements,
  auditLog,
  coupons,
  issues,
  funnelEvents,
  menuCategories,
  menuItems,
} from '../db/schema';
import { requireAuth, requireRole } from '../middleware';
import { nowUtc } from '../utils/time';
import { ulid } from '../utils/ulid';
import { IST_OFFSET_SECONDS } from '@shared/curfew';
import {
  CouponInputSchema,
  AdminVendorGatesUpdateSchema,
  AdminApplicationActionSchema,
  AdminGateUpdateSchema,
} from '@shared/schemas';
import { z } from 'zod';

export const adminRoutes = new Hono<{ Bindings: Env }>();

// All admin routes require authenticated admin role (students/vendors receive 403)
adminRoutes.use('*', requireAuth, requireRole('admin'));

function toSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return `${base || 'campus-vendor'}-${ulid().slice(-4).toLowerCase()}`;
}

function getIstDateKey(utcSeconds: number): string {
  const d = new Date((utcSeconds + IST_OFFSET_SECONDS) * 1000);
  return d.toISOString().slice(0, 10);
}

// GET /api/admin/vendors (includes batched gateReach per vendor)
adminRoutes.get('/vendors', async (c) => {
  const db = c.get('db');
  const [allVendors, allVendorGates] = await Promise.all([
    db.select().from(vendors).all(),
    db.select().from(vendorGates).all(),
  ]);

  const gatesByVendor = new Map<string, Array<{ gateId: string; extraMinutes: number }>>();
  for (const vg of allVendorGates) {
    const arr = gatesByVendor.get(vg.vendorId) || [];
    arr.push({ gateId: vg.gateId, extraMinutes: vg.extraMinutes });
    gatesByVendor.set(vg.vendorId, arr);
  }

  return c.json({
    ok: true,
    vendors: allVendors.map((v) => ({
      ...v,
      gateReach: gatesByVendor.get(v.id) || [],
    })),
  });
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
    return c.json(
      { error: { code: 'INVALID_INPUT', message: 'Status must be pending, active, or suspended' } },
      400
    );
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

// PATCH /api/admin/vendors/:id (Edit details: FSSAI, phone, hours, prep, nightSafe)
const VendorEditSchema = z.object({
  fssaiNo: z.string().min(4).max(30).optional(),
  phone: z.string().min(7).max(20).optional(),
  hoursJson: z.string().min(2).optional(),
  prepMinutes: z.number().int().min(5).max(90).optional(),
  nightSafe: z.boolean().optional(),
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

  const existing = await db.select().from(vendors).where(eq(vendors.id, vendorId)).get();
  if (!existing) {
    return c.json({ error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' } }, 404);
  }

  if (Object.keys(parseResult.data).length > 0) {
    await db.update(vendors).set(parseResult.data).where(eq(vendors.id, vendorId));
  }

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

// PUT /api/admin/vendors/:id/gates (Edit vendor gate reach and extra travel minutes)
adminRoutes.put('/vendors/:id/gates', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const vendorId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = AdminVendorGatesUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid vendor gates payload' } }, 400);
  }

  const existing = await db.select().from(vendors).where(eq(vendors.id, vendorId)).get();
  if (!existing) {
    return c.json({ error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' } }, 404);
  }

  await db.delete(vendorGates).where(eq(vendorGates.vendorId, vendorId));
  if (parsed.data.gates.length > 0) {
    await db.insert(vendorGates).values(
      parsed.data.gates.map((g) => ({
        id: ulid(),
        vendorId,
        gateId: g.gateId,
        extraMinutes: g.extraMinutes,
      }))
    );
  }

  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: 'VENDOR_GATES_UPDATED',
    targetType: 'vendors',
    targetId: vendorId,
    detailsJson: JSON.stringify(parsed.data.gates),
    at: nowUtc(),
  });

  const updatedReach = await db
    .select()
    .from(vendorGates)
    .where(eq(vendorGates.vendorId, vendorId))
    .all();

  return c.json({
    ok: true,
    vendorId,
    gateReach: updatedReach.map((vg) => ({ gateId: vg.gateId, extraMinutes: vg.extraMinutes })),
  });
});

// GET /api/admin/vendor-applications
adminRoutes.get('/vendor-applications', async (c) => {
  const db = c.get('db');
  const list = await db
    .select()
    .from(vendorApplications)
    .orderBy(desc(vendorApplications.createdAt))
    .all();

  return c.json({ ok: true, applications: list });
});

// PATCH /api/admin/vendor-applications/:id (Approve or mark reviewed; approving creates an active vendor row)
adminRoutes.patch('/vendor-applications/:id', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const appId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = AdminApplicationActionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: 'Status must be reviewed or approved' } },
      400
    );
  }

  const application = await db
    .select()
    .from(vendorApplications)
    .where(eq(vendorApplications.id, appId))
    .get();
  if (!application) {
    return c.json({ error: { code: 'APPLICATION_NOT_FOUND', message: 'Application not found' } }, 404);
  }

  const now = nowUtc();
  let createdVendorId: string | null = null;

  if (parsed.data.status === 'approved' && application.status !== 'approved') {
    const cleanSlug = toSlug(application.vendorName);
    const existingVendor = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(eq(vendors.slug, cleanSlug))
      .get();
    if (existingVendor) {
      return c.json(
        {
          error: {
            code: 'DUPLICATE_VENDOR',
            message: 'A campus vendor with this name or slug already exists.',
          },
        },
        409
      );
    }

    const shopCoverMap: Record<string, string> = {
      fruits: '/images/categories/juices.jpg',
      vegetables: '/images/categories/vegetables-real.jpg',
      groceries: '/images/categories/groceries-real.jpg',
      raw_chicken: '/images/categories/chicken-real.jpg',
    };
    const defaultCover = shopCoverMap[application.shopType || ''] || '/images/categories/food.jpg';

    const newVendorId = `v_${ulid().slice(-8).toLowerCase()}`;
    const prepMinutes = parsed.data.prepMinutes ?? 15;
    await db.insert(vendors).values({
      id: newVendorId,
      campusId: application.campusId,
      slug: cleanSlug,
      name: application.vendorName.trim(),
      tagline: 'NIT Patna Campus Partner',
      category: parsed.data.category || application.shopType || 'snacks',
      coverImageUrl: defaultCover,
      description: `Verified NIT Patna partner (${application.shopType}).`,
      fssaiNo: 'FSSAI: pending verification',
      phone: application.phone,
      hoursJson: JSON.stringify({ open: '09:00', close: '22:00' }),
      prepMinutes,
      prepMaxMinutes: prepMinutes + 10,
      minOrderPaise: 0,
      isOpen: true,
      nightSafe: true,
      status: 'active',
      ratingAvg: 4.5,
      ratingCount: 1,
      createdAt: now,
    });

    const campusGates = await db
      .select()
      .from(gates)
      .where(eq(gates.campusId, application.campusId))
      .all();

    if (campusGates.length > 0) {
      await db.insert(vendorGates).values(
        campusGates.map((g) => ({
          id: ulid(),
          vendorId: newVendorId,
          gateId: g.id,
          extraMinutes: 0,
        }))
      );
    }

    createdVendorId = newVendorId;
  }

  await db
    .update(vendorApplications)
    .set({ status: parsed.data.status })
    .where(eq(vendorApplications.id, appId));

  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: 'VENDOR_APPLICATION_UPDATED',
    targetType: 'vendor_applications',
    targetId: appId,
    detailsJson: JSON.stringify({ status: parsed.data.status, createdVendorId }),
    at: now,
  });

  const updated = await db
    .select()
    .from(vendorApplications)
    .where(eq(vendorApplications.id, appId))
    .get();

  return c.json({ ok: true, application: updated, createdVendorId });
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
    vendorId: vendorId || 'rest_csb_nitp',
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

  const inviteLink = `https://${c.req.header('host') || 'localhost'}/vendor?invite=${userId}`;
  return c.json({ ok: true, userId, email, inviteLink });
});

// DELETE /api/admin/vendors/:id (Remove test/unlaunched vendor only when it has zero historical orders)
adminRoutes.delete('/vendors/:id', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const vendorId = c.req.param('id');

  const existing = await db.select().from(vendors).where(eq(vendors.id, vendorId)).get();
  if (!existing) {
    return c.json({ error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' } }, 404);
  }

  const orderCount = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.vendorId, vendorId))
    .get();
  if (orderCount) {
    return c.json(
      {
        error: {
          code: 'VENDOR_HAS_ORDERS',
          message: 'Cannot delete a vendor that already has recorded orders.',
        },
      },
      409
    );
  }

  await db.batch([
    db.delete(vendorGates).where(eq(vendorGates.vendorId, vendorId)),
    db.delete(menuItems).where(eq(menuItems.vendorId, vendorId)),
    db.delete(menuCategories).where(eq(menuCategories.vendorId, vendorId)),
    db.delete(vendors).where(eq(vendors.id, vendorId)),
  ]);

  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: 'VENDOR_DELETED',
    targetType: 'vendors',
    targetId: vendorId,
    detailsJson: JSON.stringify({ name: existing.name, slug: existing.slug }),
    at: nowUtc(),
  });

  return c.json({ ok: true, deletedVendorId: vendorId });
});

// GET /api/admin/gates
adminRoutes.get('/gates', async (c) => {
  const db = c.get('db');
  const allGates = await db.select().from(gates).all();
  return c.json({ ok: true, gates: allGates });
});

// PATCH /api/admin/gates/:id (Update hours/curfew, buffer, travel, temporary closure + banner broadcast)
adminRoutes.patch('/gates/:id', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const gateId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parseResult = AdminGateUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: parseResult.error.errors[0]?.message || 'Invalid gate settings' } },
      400
    );
  }

  const existing = await db.select().from(gates).where(eq(gates.id, gateId)).get();
  if (!existing) {
    return c.json({ error: { code: 'GATE_NOT_FOUND', message: 'Gate not found' } }, 404);
  }

  const { broadcastBanner, bannerMessage, ...gateUpdate } = parseResult.data;
  const now = nowUtc();

  if (Object.keys(gateUpdate).length > 0) {
    await db.update(gates).set(gateUpdate).where(eq(gates.id, gateId));
  }

  let broadcastAnnouncementId: string | null = null;
  if (broadcastBanner) {
    broadcastAnnouncementId = ulid();
    const defaultMsg =
      gateUpdate.active === false
        ? `Temporary Gate Closure: Deliveries to ${existing.name} are paused right now. Please select another open gate.`
        : `Gate Notice: ${existing.name} is open again for NIT Patna deliveries.`;
    await db.insert(announcements).values({
      id: broadcastAnnouncementId,
      campusId: existing.campusId,
      message: bannerMessage || defaultMsg,
      active: true,
      createdAt: now,
    });
  }

  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: gateUpdate.active !== undefined ? 'GATE_CLOSURE_UPDATED' : 'GATE_SETTINGS_UPDATED',
    targetType: 'gates',
    targetId: gateId,
    detailsJson: JSON.stringify({ ...gateUpdate, broadcastBanner: Boolean(broadcastBanner) }),
    at: now,
  });

  const updated = await db.select().from(gates).where(eq(gates.id, gateId)).get();
  return c.json({ ok: true, gate: updated, broadcastAnnouncementId });
});

// POST /api/admin/gates/festival-override (Close a gate or all campus for a festival/holiday)
const FestivalOverrideSchema = z.object({
  gateId: z.string().optional(),
  festivalName: z.string().min(2),
  active: z.boolean(),
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
    await db.update(gates).set({ active }).all();
  }

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

// GET /api/admin/orders (Live orders monitor with status, gateId, vendorId, and search q filters)
adminRoutes.get('/orders', async (c) => {
  const db = c.get('db');
  const statusFilter = c.req.query('status')?.trim() || '';
  const gateFilter = c.req.query('gateId')?.trim() || '';
  const vendorFilter = c.req.query('vendorId')?.trim() || '';
  const searchQ = (c.req.query('q') || '').trim().toLowerCase();

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
    .limit(120)
    .all();

  const filtered = allOrders
    .filter(({ order, vendor, gate }) => {
      if (statusFilter === 'live') {
        if (!['placed', 'accepted', 'out_for_delivery', 'at_gate'].includes(order.status)) return false;
      } else if (statusFilter && order.status !== statusFilter) {
        return false;
      }
      if (gateFilter && order.gateId !== gateFilter) return false;
      if (vendorFilter && order.vendorId !== vendorFilter) return false;
      if (searchQ) {
        const hay = `${order.publicNo} ${order.id} ${order.handoverCode} ${vendor.name} ${gate.name}`.toLowerCase();
        if (!hay.includes(searchQ)) return false;
      }
      return true;
    })
    .slice(0, 60);

  return c.json({
    ok: true,
    orders: filtered.map(({ order, vendor, gate }) => ({
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

async function buildAdminMetrics(db: ReturnType<typeof import('../db').getDb>) {
  const [allOrders, allVendors, allGates, openIssues, funnelAgg] = await Promise.all([
    db.select().from(orders).all(),
    db.select().from(vendors).all(),
    db.select().from(gates).where(eq(gates.active, true)).all(),
    db.select().from(issues).where(eq(issues.status, 'open')).all(),
    db
      .select({
        eventName: funnelEvents.eventName,
        count: sql<number>`count(*)`,
      })
      .from(funnelEvents)
      .groupBy(funnelEvents.eventName)
      .all(),
  ]);

  const funnelCounts = {
    view_menu: 0,
    add_to_cart: 0,
    checkout_start: 0,
    order_placed: 0,
    handover_confirmed: 0,
  };
  for (const row of funnelAgg) {
    if (row.eventName in funnelCounts) {
      funnelCounts[row.eventName as keyof typeof funnelCounts] = Number(row.count || 0);
    }
  }

  const now = nowUtc();
  const istToday = getIstDateKey(now);

  const delivered = allOrders.filter((o) => o.status === 'delivered');
  const deliveredToday = delivered.filter(
    (o) => getIstDateKey(o.deliveredAt || o.createdAt) === istToday
  );
  const active = allOrders.filter((o) =>
    ['placed', 'accepted', 'out_for_delivery', 'at_gate'].includes(o.status)
  );
  const cancelled = allOrders.filter((o) => o.status === 'cancelled');
  const activeVendors = allVendors.filter((v) => v.status === 'active' && v.isOpen);

  const totalRevenuePaise = delivered.reduce((sum, o) => sum + o.totalPaise, 0);

  const avgVendorPrep =
    activeVendors.length > 0
      ? activeVendors.reduce((s, v) => s + v.prepMinutes, 0) / activeVendors.length
      : 15;
  const avgGateTravel =
    allGates.length > 0
      ? allGates.reduce((s, g) => s + g.travelMinutes, 0) / allGates.length
      : 8;
  const avgGateEtaMinutes = Math.max(10, Math.round(avgVendorPrep + avgGateTravel));

  const hourlyCounts = Array(12).fill(0) as number[];
  for (const o of allOrders) {
    const istHour = new Date((o.createdAt + IST_OFFSET_SECONDS) * 1000).getUTCHours();
    const bucket = Math.floor(istHour / 2);
    if (bucket >= 0 && bucket < 12) {
      hourlyCounts[bucket]++;
    }
  }

  const acceptanceRate =
    allOrders.length > 0
      ? Math.round(((allOrders.length - cancelled.length) / allOrders.length) * 100)
      : 100;

  const cancellationRate =
    allOrders.length > 0 ? Math.round((cancelled.length / allOrders.length) * 100) : 0;

  return {
    totalOrders: allOrders.length,
    liveOrders: active.length,
    activeOrders: active.length,
    deliveredOrders: delivered.length,
    deliveredToday: deliveredToday.length,
    cancelledOrders: cancelled.length,
    totalRevenuePaise,
    totalRevenueRupees: totalRevenuePaise / 100,
    activeVendorsCount: activeVendors.length,
    vendorsOpenCount: activeVendors.length,
    openComplaintsCount: openIssues.length,
    avgGateEtaMinutes,
    acceptanceRate,
    cancellationRate,
    medianDeliveryMinutes: avgGateEtaMinutes,
    hourlyDistribution: hourlyCounts,
    funnelCounts,
  };
}

// GET /api/admin/metrics and /api/admin/stats
adminRoutes.get('/metrics', async (c) => {
  const metrics = await buildAdminMetrics(c.get('db'));
  return c.json({ ok: true, metrics });
});

adminRoutes.get('/stats', async (c) => {
  const metrics = await buildAdminMetrics(c.get('db'));
  return c.json({ ok: true, stats: metrics, metrics });
});

// GET /api/admin/settlements (Settlement report grouped by vendor and IST day)
adminRoutes.get('/settlements', async (c) => {
  const db = c.get('db');
  const vendorFilter = c.req.query('vendorId')?.trim() || '';
  const dateFilter = c.req.query('date')?.trim() || '';

  const [deliveredOrders, allVendors] = await Promise.all([
    db.select().from(orders).where(eq(orders.status, 'delivered')).all(),
    db.select().from(vendors).all(),
  ]);

  const vendorMap = new Map(allVendors.map((v) => [v.id, v.name]));
  const grouped = new Map<
    string,
    {
      key: string;
      vendorId: string;
      vendorName: string;
      date: string;
      ordersCount: number;
      grossPaise: number;
      discountPaise: number;
      payAtGatePaise: number;
      upiPaise: number;
    }
  >();

  for (const o of deliveredOrders) {
    if (vendorFilter && o.vendorId !== vendorFilter) continue;
    const dateKey = getIstDateKey(o.deliveredAt || o.createdAt);
    if (dateFilter && dateKey !== dateFilter) continue;

    const mapKey = `${o.vendorId}::${dateKey}`;
    const bucket = grouped.get(mapKey) || {
      key: mapKey,
      vendorId: o.vendorId,
      vendorName: vendorMap.get(o.vendorId) || o.vendorId,
      date: dateKey,
      ordersCount: 0,
      grossPaise: 0,
      discountPaise: 0,
      payAtGatePaise: 0,
      upiPaise: 0,
    };

    bucket.ordersCount += 1;
    bucket.grossPaise += o.totalPaise;
    bucket.discountPaise += o.discountPaise || 0;
    if (o.paymentMethod === 'upi_simulated') {
      bucket.upiPaise += o.totalPaise;
    } else {
      bucket.payAtGatePaise += o.totalPaise;
    }
    grouped.set(mapKey, bucket);
  }

  const rows = Array.from(grouped.values()).sort(
    (a, b) => b.date.localeCompare(a.date) || b.grossPaise - a.grossPaise
  );

  return c.json({ ok: true, settlements: rows });
});

// GET /api/admin/coupons
adminRoutes.get('/coupons', async (c) => {
  const db = c.get('db');
  const list = await db.select().from(coupons).orderBy(desc(coupons.createdAt)).all();
  return c.json({ ok: true, coupons: list });
});

// POST /api/admin/coupons
adminRoutes.post('/coupons', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({}));
  const parsed = CouponInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message || 'Invalid coupon data' } },
      400
    );
  }

  const now = nowUtc();
  const id = ulid();
  await db.insert(coupons).values({
    id,
    campusId: 'campus_nitp',
    code: parsed.data.code,
    description: parsed.data.description,
    discountType: parsed.data.discountType,
    discountValue: parsed.data.discountValue,
    minOrderPaise: parsed.data.minOrderPaise,
    maxDiscountPaise: parsed.data.maxDiscountPaise ?? null,
    newUsersOnly: parsed.data.newUsersOnly,
    active: parsed.data.active,
    expiresAt: parsed.data.expiresAt ?? null,
    createdAt: now,
  });

  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: 'COUPON_CREATED',
    targetType: 'coupons',
    targetId: id,
    detailsJson: JSON.stringify({ code: parsed.data.code }),
    at: now,
  });

  const created = await db.select().from(coupons).where(eq(coupons.id, id)).get();
  return c.json({ ok: true, coupon: created }, 201);
});

// PATCH /api/admin/coupons/:id
adminRoutes.patch('/coupons/:id', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const id = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as { active?: boolean };
  if (typeof body.active !== 'boolean') {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'active must be boolean' } }, 400);
  }

  await db.update(coupons).set({ active: body.active }).where(eq(coupons.id, id));
  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: 'COUPON_UPDATED',
    targetType: 'coupons',
    targetId: id,
    detailsJson: JSON.stringify({ active: body.active }),
    at: nowUtc(),
  });

  const updated = await db.select().from(coupons).where(eq(coupons.id, id)).get();
  return c.json({ ok: true, coupon: updated });
});

// GET /api/admin/reports (Issues & Disputes Queue)
adminRoutes.get('/reports', async (c) => {
  const db = c.get('db');
  const list = await db
    .select({
      issue: issues,
      vendorName: vendors.name,
      orderPublicNo: orders.publicNo,
      orderTotalPaise: orders.totalPaise,
    })
    .from(issues)
    .innerJoin(vendors, eq(issues.vendorId, vendors.id))
    .innerJoin(orders, eq(issues.orderId, orders.id))
    .orderBy(desc(issues.createdAt))
    .all();

  return c.json({
    ok: true,
    reports: list.map((r) => ({
      ...r.issue,
      vendorName: r.vendorName,
      orderPublicNo: r.orderPublicNo,
      orderTotalPaise: r.orderTotalPaise,
    })),
  });
});

// PATCH /api/admin/reports/:id (Resolve, refund, credit or reject report)
const ReportResolveSchema = z.object({
  status: z.enum(['resolved', 'refunded', 'credited', 'rejected']),
  resolutionNote: z.string().max(200).optional(),
  refundPaise: z.number().int().nonnegative().optional(),
});

adminRoutes.patch('/reports/:id', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = ReportResolveSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'Invalid report resolution payload' } }, 400);
  }

  const existing = await db.select().from(issues).where(eq(issues.id, id)).get();
  if (!existing) {
    return c.json({ error: { code: 'REPORT_NOT_FOUND', message: 'Report not found' } }, 404);
  }

  const now = nowUtc();
  await db
    .update(issues)
    .set({
      status: parsed.data.status,
      resolutionNote: parsed.data.resolutionNote || null,
      refundPaise: parsed.data.refundPaise || 0,
    })
    .where(eq(issues.id, id));

  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: 'REPORT_RESOLVED',
    targetType: 'issues',
    targetId: id,
    detailsJson: JSON.stringify(parsed.data),
    at: now,
  });

  const updated = await db.select().from(issues).where(eq(issues.id, id)).get();
  return c.json({ ok: true, report: updated });
});

// GET /api/admin/announcements
adminRoutes.get('/announcements', async (c) => {
  const db = c.get('db');
  const list = await db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.createdAt))
    .limit(30)
    .all();
  return c.json({ ok: true, announcements: list });
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

// PATCH /api/admin/announcements/:id (Activate/deactivate banner)
adminRoutes.patch('/announcements/:id', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const id = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as { active?: boolean };
  if (typeof body.active !== 'boolean') {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'active must be boolean' } }, 400);
  }

  await db.update(announcements).set({ active: body.active }).where(eq(announcements.id, id));
  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: 'ANNOUNCEMENT_UPDATED',
    targetType: 'announcements',
    targetId: id,
    detailsJson: JSON.stringify({ active: body.active }),
    at: nowUtc(),
  });

  const updated = await db.select().from(announcements).where(eq(announcements.id, id)).get();
  return c.json({ ok: true, announcement: updated });
});

// GET /api/admin/audit-log
adminRoutes.get('/audit-log', async (c) => {
  const db = c.get('db');
  const actionFilter = c.req.query('action')?.trim() || '';
  const logs = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.at))
    .limit(150)
    .all();

  const filtered = actionFilter ? logs.filter((l) => l.action.includes(actionFilter)) : logs;
  return c.json({ ok: true, logs: filtered });
});
