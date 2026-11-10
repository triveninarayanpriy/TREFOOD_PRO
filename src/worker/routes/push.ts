import { Hono } from 'hono';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type { Env } from '../types';
import { gates, orderEvents, orders, pushSubscriptions, vendors } from '../db/schema';
import { requireAuth } from '../middleware';
import { PushSubscribeSchema, PushUnsubscribeSchema } from '@shared/schemas';
import type { OrderNotificationItem } from '@shared/types';
import { nowUtc } from '../utils/time';
import { ulid } from '../utils/ulid';

export const pushRoutes = new Hono<{ Bindings: Env }>();
export const notificationRoutes = new Hono<{ Bindings: Env }>();

function buildStatusCardCopy(status: string, vendorName: string, gateName: string, handoverCode: string): {
  title: string;
  summary: string;
} {
  switch (status) {
    case 'placed':
      return {
        title: `Order sent to ${vendorName}`,
        summary: `Waiting for kitchen acceptance for ${gateName}.`,
      };
    case 'accepted':
      return {
        title: `${vendorName} accepted your order`,
        summary: `Freshly preparing your packet for ${gateName}.`,
      };
    case 'out_for_delivery':
      return {
        title: `Heading to ${gateName}`,
        summary: `Partner left ${vendorName}. Keep code ${handoverCode} ready.`,
      };
    case 'at_gate':
      return {
        title: `Packet is at ${gateName}`,
        summary: `Match code ${handoverCode} on the packet within 15 minutes.`,
      };
    case 'delivered':
      return {
        title: `Handover confirmed`,
        summary: `Collected from ${vendorName} at ${gateName}.`,
      };
    case 'cancelled':
      return {
        title: `Order cancelled`,
        summary: `Order from ${vendorName} was cancelled.`,
      };
    case 'expired':
      return {
        title: `Order expired`,
        summary: `Order from ${vendorName} was not accepted in time.`,
      };
    default:
      return {
        title: `Order update from ${vendorName}`,
        summary: `Status updated for ${gateName}.`,
      };
  }
}

// GET /api/push/vapid-public-key
pushRoutes.get('/vapid-public-key', (c) => {
  const publicKey = c.env.VAPID_PUBLIC_KEY?.trim() || null;
  return c.json({
    ok: true,
    supported: Boolean(publicKey && c.env.VAPID_PRIVATE_KEY?.trim()),
    publicKey,
    fallbackMode: publicKey ? 'web_push' : 'in_app_status_card',
  });
});

// POST /api/push/subscribe (authenticated)
pushRoutes.post('/subscribe', requireAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({}));
  const parsed = PushSubscribeSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: parsed.error.errors[0]?.message || 'Valid Web Push subscription required',
        },
      },
      400
    );
  }

  const { endpoint, keys } = parsed.data;
  const now = nowUtc();

  // Check user's existing subscriptions via idx_push_user
  const existingForUser = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, user.id))
    .all();

  const matching = existingForUser.find((s) => s.endpoint === endpoint);
  if (matching) {
    await db
      .update(pushSubscriptions)
      .set({
        p256dh: keys.p256dh,
        auth: keys.auth,
        createdAt: now,
      })
      .where(eq(pushSubscriptions.id, matching.id));

    return c.json({ ok: true, subscriptionId: matching.id, updated: true });
  }

  const subscriptionId = ulid();
  await db.insert(pushSubscriptions).values({
    id: subscriptionId,
    userId: user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    createdAt: now,
  });

  return c.json({ ok: true, subscriptionId, updated: false }, 201);
});

// DELETE /api/push/subscribe (authenticated)
pushRoutes.delete('/subscribe', requireAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({}));
  const parsed = PushUnsubscribeSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: 'Endpoint URL is required to unsubscribe' } },
      400
    );
  }

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, user.id),
        eq(pushSubscriptions.endpoint, parsed.data.endpoint)
      )
    );

  return c.json({ ok: true });
});

// GET /api/notifications (concise status-card feed from user's recent order events)
notificationRoutes.get('/', requireAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const limitParam = Number.parseInt(c.req.query('limit') || '12', 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 25) : 12;

  const recentOrders = await db
    .select({
      order: orders,
      vendorName: vendors.name,
      gateName: gates.name,
    })
    .from(orders)
    .innerJoin(vendors, eq(orders.vendorId, vendors.id))
    .innerJoin(gates, eq(orders.gateId, gates.id))
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt))
    .limit(40)
    .all();

  if (recentOrders.length === 0) {
    return c.json({ ok: true, notifications: [] as OrderNotificationItem[] });
  }

  const orderMap = new Map(recentOrders.map((r) => [r.order.id, r]));
  const orderIds = recentOrders.map((r) => r.order.id);

  // Indexed batch query on idx_order_events_order_at
  const events = await db
    .select()
    .from(orderEvents)
    .where(inArray(orderEvents.orderId, orderIds))
    .orderBy(desc(orderEvents.at))
    .limit(120)
    .all();

  const seenOrders = new Set<string>();
  const notifications: OrderNotificationItem[] = [];

  for (const ev of events) {
    if (seenOrders.has(ev.orderId)) continue;
    seenOrders.add(ev.orderId);

    const row = orderMap.get(ev.orderId);
    if (!row) continue;

    const copy = buildStatusCardCopy(
      ev.status,
      row.vendorName,
      row.gateName,
      row.order.handoverCode
    );

    notifications.push({
      id: ev.id,
      orderId: row.order.id,
      publicNo: row.order.publicNo,
      vendorName: row.vendorName,
      gateName: row.gateName,
      status: ev.status,
      title: copy.title,
      summary: copy.summary,
      at: ev.at,
    });

    if (notifications.length >= limit) break;
  }

  return c.json({ ok: true, notifications });
});
