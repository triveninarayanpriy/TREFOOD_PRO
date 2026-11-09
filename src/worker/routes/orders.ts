import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import type { Env } from '../types';
import {
  orders,
  orderItems,
  orderEvents,
  vendors,
  gates,
  vendorGates,
  reviews,
  issues,
  auditLog,
} from '../db/schema';
import { requireAuth } from '../middleware';
import { canDeliver } from '../services/delivery';
import { priceCart, CartConflictError } from '../services/cart';
import { nextStatus, StatusTransitionError, type OrderStatus } from '../services/order';
import { generateHandoverCode } from '../services/handover';
import { nowUtc, getRequestNow } from '../utils/time';
import { ulid } from '../utils/ulid';
import { sha256 } from '../utils/crypto';
import {
  CreateOrderRequestSchema,
  CancelOrderSchema,
  ReviewOrderSchema,
  IssueReportSchema,
} from '@shared/schemas';

export const orderRoutes = new Hono<{ Bindings: Env }>();

// All order routes require authentication
orderRoutes.use('*', requireAuth);

// POST /api/orders
orderRoutes.post('/', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;

  const idempotencyKey = c.req.header('idempotency-key')?.trim();
  if (!idempotencyKey) {
    return c.json(
      { error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'The Idempotency-Key header is required to place an order.' } },
      400
    );
  }

  // Check if order already exists with this idempotency key
  const existingOrder = await db
    .select()
    .from(orders)
    .where(eq(orders.idempotencyKey, idempotencyKey))
    .get();

  if (existingOrder) {
    // Return existing order idempotently
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, existingOrder.id)).all();
    const events = await db.select().from(orderEvents).where(eq(orderEvents.orderId, existingOrder.id)).all();
    return c.json({ ok: true, order: { ...existingOrder, items, events }, replayed: true }, 200);
  }

  const body = await c.req.json().catch(() => ({}));
  const parseResult = CreateOrderRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: parseResult.error.errors[0]?.message || 'Invalid input' } },
      400
    );
  }

  const { vendorId, gateId, items } = parseResult.data;
  const now = getRequestNow(c);

  // Validate gate
  const allGates = await db.select().from(gates).all();
  const gate = allGates.find((g) => g.id === gateId);
  if (!gate) {
    return c.json({ error: { code: 'GATE_NOT_FOUND', message: 'Gate not found' } }, 404);
  }

  // Validate vendor
  const vendor = await db.select().from(vendors).where(eq(vendors.id, vendorId)).get();
  if (!vendor) {
    return c.json({ error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' } }, 404);
  }

  // Check reachability
  const vg = await db
    .select()
    .from(vendorGates)
    .where(and(eq(vendorGates.vendorId, vendorId), eq(vendorGates.gateId, gateId)))
    .get();

  // Check delivery capability
  const deliveryCheck = canDeliver(gate, vendor, now, vg, allGates);
  if (!deliveryCheck.ok) {
    return c.json(
      {
        error: {
          code: deliveryCheck.reason || 'CANNOT_DELIVER',
          message: deliveryCheck.message || 'Cannot deliver to chosen gate at this time.',
          alternativeGates: deliveryCheck.alternativeGates,
        },
      },
      400
    );
  }

  // Price cart
  let pricedCart;
  try {
    pricedCart = await priceCart(db, vendorId, items);
  } catch (err) {
    if (err instanceof CartConflictError) {
      return c.json({ error: { code: err.code, message: err.message, details: err.details } }, 409);
    }
    throw err;
  }

  // Generate 4-digit handover code unique to active orders at this gate
  const handoverCode = await generateHandoverCode(db, gateId);

  const orderId = ulid();
  const publicNo = `TF-${Math.floor(1000 + Math.random() * 9000)}`;

  // Insert order
  await db.insert(orders).values({
    id: orderId,
    publicNo,
    campusId: gate.campusId,
    userId: user.id,
    vendorId,
    gateId,
    status: 'placed',
    subtotalPaise: pricedCart.subtotalPaise,
    totalPaise: pricedCart.totalPaise,
    paymentMethod: 'pay_at_gate',
    handoverCode,
    idempotencyKey,
    etaAt: deliveryCheck.etaAt,
    placedAt: now,
    createdAt: now,
  });

  // Insert order items snapshot
  for (const item of pricedCart.items) {
    await db.insert(orderItems).values({
      id: ulid(),
      orderId,
      itemId: item.itemId,
      name: item.name,
      pricePaise: item.pricePaise,
      quantity: item.quantity,
      notes: item.notes || null,
    });
  }

  // Insert initial order event
  await db.insert(orderEvents).values({
    id: ulid(),
    orderId,
    status: 'placed',
    actorId: user.id,
    at: now,
    note: 'Order placed by customer',
  });

  const createdOrder = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  const createdItems = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();

  return c.json(
    {
      ok: true,
      order: {
        ...createdOrder,
        items: createdItems,
        vendorName: vendor.name,
        gateName: gate.name,
      },
    },
    201
  );
});

// GET /api/orders (History for logged in customer)
orderRoutes.get('/', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;

  const userOrders = await db
    .select({
      order: orders,
      vendor: vendors,
      gate: gates,
    })
    .from(orders)
    .innerJoin(vendors, eq(orders.vendorId, vendors.id))
    .innerJoin(gates, eq(orders.gateId, gates.id))
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt))
    .all();

  const formatted = userOrders.map(({ order, vendor, gate }) => ({
    ...order,
    vendorName: vendor.name,
    gateName: gate.name,
  }));

  return c.json({ ok: true, orders: formatted });
});

// GET /api/orders/:id (With ETag and 304 support)
orderRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const orderId = c.req.param('id');

  const orderRecord = await db
    .select({
      order: orders,
      vendor: vendors,
      gate: gates,
    })
    .from(orders)
    .innerJoin(vendors, eq(orders.vendorId, vendors.id))
    .innerJoin(gates, eq(orders.gateId, gates.id))
    .where(eq(orders.id, orderId))
    .get();

  if (!orderRecord) {
    return c.json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } }, 404);
  }

  const { order, vendor, gate } = orderRecord;

  // Authorization check: student must be owner; vendor must own vendorId; admin can view all
  const isOwner = order.userId === user.id;
  const isAssignedVendor = user.role === 'vendor' && user.vendorId === order.vendorId;
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAssignedVendor && !isAdmin) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'You are not allowed to view this order.' } }, 403);
  }

  // Calculate ETag from order status, eta, and timestamps
  const etagSource = `${order.id}:${order.status}:${order.etaAt}:${order.deliveredAt || order.cancelledAt || order.atGateAt || order.placedAt}`;
  const etag = `"${await sha256(etagSource)}"`;

  const ifNoneMatch = c.req.header('if-none-match');
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).all();
  const events = await db
    .select()
    .from(orderEvents)
    .where(eq(orderEvents.orderId, order.id))
    .orderBy(desc(orderEvents.at))
    .all();

  c.header('ETag', etag);

  return c.json({
    ok: true,
    order: {
      ...order,
      vendorName: vendor.name,
      vendorPhone: vendor.phone,
      gateName: gate.name,
      items,
      events,
    },
  });
});

// POST /api/orders/:id/cancel
orderRoutes.post('/:id/cancel', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const orderId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parseResult = CancelOrderSchema.safeParse(body);
  const reason = parseResult.success ? parseResult.data.reason : undefined;

  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) {
    return c.json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } }, 404);
  }

  const isOwner = order.userId === user.id;

  try {
    nextStatus(order.status as OrderStatus, 'cancelled', user.role, isOwner);
  } catch (err) {
    if (err instanceof StatusTransitionError) {
      return c.json({ error: { code: err.code, message: err.message } }, err.status);
    }
    throw err;
  }

  const now = nowUtc();
  await db
    .update(orders)
    .set({
      status: 'cancelled',
      cancelledAt: now,
      cancelReason: reason || 'Cancelled by user',
    })
    .where(eq(orders.id, order.id));

  await db.insert(orderEvents).values({
    id: ulid(),
    orderId: order.id,
    status: 'cancelled',
    actorId: user.id,
    at: now,
    note: reason || `Cancelled by ${user.role}`,
  });

  return c.json({ ok: true, status: 'cancelled' });
});

// POST /api/orders/:id/confirm (Customer confirms delivery at gate upon matching 4-digit code)
orderRoutes.post('/:id/confirm', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const orderId = c.req.param('id');

  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) {
    return c.json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } }, 404);
  }

  const isOwner = order.userId === user.id;

  // Domain rule: Only the customer who owns the order can confirm delivery, and only when status is at_gate
  try {
    nextStatus(order.status as OrderStatus, 'delivered', user.role, isOwner);
  } catch (err) {
    if (err instanceof StatusTransitionError) {
      return c.json({ error: { code: err.code, message: err.message } }, err.status);
    }
    throw err;
  }

  const now = nowUtc();
  await db
    .update(orders)
    .set({
      status: 'delivered',
      deliveredAt: now,
    })
    .where(eq(orders.id, order.id));

  await db.insert(orderEvents).values({
    id: ulid(),
    orderId: order.id,
    status: 'delivered',
    actorId: user.id,
    at: now,
    note: 'Customer confirmed packet code match and accepted delivery',
  });

  return c.json({ ok: true, status: 'delivered', deliveredAt: now });
});

// POST /api/orders/:id/review
orderRoutes.post('/:id/review', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const orderId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parseResult = ReviewOrderSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: parseResult.error.errors[0]?.message || 'Invalid rating' } },
      400
    );
  }

  const { rating, comment } = parseResult.data;

  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) {
    return c.json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } }, 404);
  }

  if (order.userId !== user.id) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Only order owner can review' } }, 403);
  }

  if (order.status !== 'delivered') {
    return c.json({ error: { code: 'NOT_DELIVERED', message: 'Reviews can only be submitted for delivered orders' } }, 400);
  }

  const existingReview = await db.select().from(reviews).where(eq(reviews.orderId, orderId)).get();
  if (existingReview) {
    return c.json({ error: { code: 'ALREADY_REVIEWED', message: 'You have already reviewed this order.' } }, 400);
  }

  const now = nowUtc();
  await db.insert(reviews).values({
    id: ulid(),
    orderId,
    vendorId: order.vendorId,
    userId: user.id,
    rating,
    comment: comment || null,
    createdAt: now,
  });

  // Update vendor average rating
  const allVendorReviews = await db.select().from(reviews).where(eq(reviews.vendorId, order.vendorId)).all();
  const totalScore = allVendorReviews.reduce((sum, r) => sum + r.rating, 0);
  const avg = Number((totalScore / allVendorReviews.length).toFixed(1));

  await db
    .update(vendors)
    .set({
      ratingAvg: avg,
      ratingCount: allVendorReviews.length,
    })
    .where(eq(vendors.id, order.vendorId));

  return c.json({ ok: true, ratingAvg: avg, ratingCount: allVendorReviews.length });
});

// POST /api/orders/:id/issue
orderRoutes.post('/:id/issue', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const orderId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parseResult = IssueReportSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: parseResult.error.errors[0]?.message || 'Invalid input' } },
      400
    );
  }

  const { reason, description } = parseResult.data;

  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) {
    return c.json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } }, 404);
  }

  if (order.userId !== user.id) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Only order owner can report an issue' } }, 403);
  }

  const now = nowUtc();
  const issueId = ulid();

  await db.insert(issues).values({
    id: issueId,
    orderId,
    userId: user.id,
    vendorId: order.vendorId,
    reason,
    description,
    status: 'open',
    createdAt: now,
  });

  await db.insert(auditLog).values({
    id: ulid(),
    actorId: user.id,
    action: 'ORDER_ISSUE_REPORTED',
    targetType: 'orders',
    targetId: orderId,
    detailsJson: JSON.stringify({ issueId, reason }),
    at: now,
  });

  return c.json({ ok: true, issueId, status: 'open' });
});
