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
import { verifyHandoverAttempt } from '@shared/handover';
import { nowUtc, getRequestNow } from '../utils/time';
import { ulid } from '../utils/ulid';
import { sha256 } from '../utils/crypto';
import {
  CreateOrderRequestSchema,
  CancelOrderSchema,
  ReviewOrderSchema,
  IssueReportSchema,
  ConfirmHandoverSchema,
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

  const {
    vendorId,
    gateId,
    items,
    couponCode,
    paymentMethod,
    upiSimulateResult,
    paymentRef,
    contactPhone,
    scheduledFor,
    note,
  } = parseResult.data;
  const now = getRequestNow(c);
  if (scheduledFor !== undefined && (scheduledFor < now - 60 || scheduledFor > now + 24 * 3600)) {
    return c.json(
      {
        error: {
          code: 'INVALID_SCHEDULE_SLOT',
          message: 'Scheduled delivery time must be within the next 24 hours.',
        },
      },
      400
    );
  }
  const isScheduled = Boolean(scheduledFor && scheduledFor > now);
  const checkTimestamp = isScheduled ? scheduledFor! : now;

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

  // Check delivery capability (supports future scheduled slots bounded by vendor & gate hours)
  const deliveryCheck = canDeliver(gate, vendor, checkTimestamp, vg, allGates, { isScheduled });
  if (!deliveryCheck.ok) {
    return c.json(
      {
        error: {
          code: deliveryCheck.reason || 'CANNOT_DELIVER',
          message: deliveryCheck.message || 'Cannot deliver to chosen gate at this time.',
          suggestedGate: deliveryCheck.suggestedGate,
          latestOrderTime: deliveryCheck.latestOrderTime,
          alternativeGates: deliveryCheck.alternativeGates,
        },
      },
      400
    );
  }

  // Price cart
  let pricedCart;
  try {
    pricedCart = await priceCart(db, vendorId, items, {
      couponCode,
      userId: user.id,
      nowUtcSeconds: now,
    });
  } catch (err) {
    if (err instanceof CartConflictError) {
      return c.json({ error: { code: err.code, message: err.message, details: err.details } }, 409);
    }
    throw err;
  }

  if (!pricedCart.meetsMinOrder) {
    return c.json(
      {
        error: {
          code: 'MIN_ORDER_NOT_MET',
          message: `Add ₹${(pricedCart.shortfallPaise / 100).toFixed(0)} more to meet vendor minimum order.`,
          shortfallPaise: pricedCart.shortfallPaise,
        },
      },
      409
    );
  }

  if (couponCode && pricedCart.couponError) {
    return c.json(
      {
        error: {
          code: 'COUPON_NOT_ELIGIBLE',
          message: pricedCart.couponError,
        },
      },
      409
    );
  }

  const resolvedPaymentMethod = paymentMethod || 'pay_at_gate';
  if (resolvedPaymentMethod === 'upi_simulated' && upiSimulateResult === 'failed') {
    return c.json(
      {
        error: {
          code: 'PAYMENT_FAILED',
          message: 'UPI authorization was declined. Retry UPI or switch to Pay at gate.',
        },
      },
      402
    );
  }

  // Generate 4-digit handover code unique to active orders at this gate
  const handoverCode = await generateHandoverCode(db, gateId);

  const orderId = ulid();
  const publicNo = `TF-${Math.floor(1000 + Math.random() * 9000)}`;
  const resolvedPaymentStatus = resolvedPaymentMethod === 'upi_simulated' ? 'paid' : 'pending';

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
    packingTotalPaise: pricedCart.packingTotalPaise,
    discountPaise: pricedCart.discountPaise,
    couponCode: pricedCart.couponApplied,
    totalPaise: pricedCart.totalPaise,
    paymentMethod: resolvedPaymentMethod,
    paymentStatus: resolvedPaymentStatus,
    handoverCode,
    codeAttempts: 0,
    idempotencyKey,
    scheduledFor: scheduledFor || null,
    note: note || null,
    contactPhone: contactPhone || null,
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
    note:
      resolvedPaymentMethod === 'upi_simulated' && paymentRef
        ? `Order placed via simulated UPI (ref ${paymentRef})`
        : isScheduled
          ? 'Scheduled order placed by customer'
          : 'Order placed by customer',
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

async function handleHandoverConfirmation(
  db: ReturnType<typeof import('../db').getDb>,
  order: typeof orders.$inferSelect,
  user: { id: string; role: 'student' | 'vendor' | 'admin' },
  submittedCode: string | null
) {
  const isOwner = order.userId === user.id;

  try {
    nextStatus(order.status as OrderStatus, 'delivered', user.role, isOwner);
  } catch (err) {
    if (err instanceof StatusTransitionError) {
      return {
        ok: false as const,
        error: { code: err.code, message: err.message },
        httpStatus: err.status as 400 | 403 | 404 | 409 | 423,
      };
    }
    throw err;
  }

  if (submittedCode !== null) {
    const verification = verifyHandoverAttempt({
      expectedCode: order.handoverCode,
      submittedCode,
      currentAttempts: order.codeAttempts || 0,
    });

    if (!verification.ok) {
      if (verification.newAttempts !== order.codeAttempts) {
        await db
          .update(orders)
          .set({ codeAttempts: verification.newAttempts })
          .where(eq(orders.id, order.id));

        await db.insert(orderEvents).values({
          id: ulid(),
          orderId: order.id,
          status: order.status,
          actorId: user.id,
          at: nowUtc(),
          note: `Failed handover code attempt (${verification.newAttempts}/5)`,
        });
      }

      return {
        ok: false as const,
        error: {
          code: verification.reason || 'CODE_MISMATCH',
          message: verification.message || 'Handover code does not match.',
          attemptsRemaining: verification.attemptsRemaining,
          locked: verification.locked,
        },
        httpStatus: (verification.locked ? 423 : 400) as 400 | 423,
      };
    }
  }

  const now = nowUtc();
  await db
    .update(orders)
    .set({
      status: 'delivered',
      deliveredAt: now,
      paymentStatus: 'paid',
    })
    .where(eq(orders.id, order.id));

  await db.insert(orderEvents).values({
    id: ulid(),
    orderId: order.id,
    status: 'delivered',
    actorId: user.id,
    at: now,
    note: 'Customer matched packet 4-digit code and confirmed delivery',
  });

  return { ok: true as const, status: 'delivered' as const, deliveredAt: now };
}

// POST /api/orders/:id/confirm (Backwards-compatible confirmation; verifies code if passed)
orderRoutes.post('/:id/confirm', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const orderId = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as { handoverCode?: string };

  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) {
    return c.json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } }, 404);
  }

  const submittedCode = typeof body.handoverCode === 'string' ? body.handoverCode : null;
  const result = await handleHandoverConfirmation(db, order, user, submittedCode);
  if (!result.ok) {
    return c.json({ error: result.error }, result.httpStatus);
  }
  return c.json(result);
});

// POST /api/orders/:id/confirm-handover (Strict 4-digit code verification with 5-attempt lockout)
orderRoutes.post('/:id/confirm-handover', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const orderId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  const parsed = ConfirmHandoverSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message || 'Invalid handover code format' } },
      400
    );
  }

  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) {
    return c.json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } }, 404);
  }

  const result = await handleHandoverConfirmation(db, order, user, parsed.data.handoverCode);
  if (!result.ok) {
    return c.json({ error: result.error }, result.httpStatus);
  }
  return c.json(result);
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

async function handleIssueOrReport(
  db: ReturnType<typeof import('../db').getDb>,
  orderId: string,
  user: { id: string },
  body: unknown
) {
  const parseResult = IssueReportSchema.safeParse(body);
  if (!parseResult.success) {
    return {
      ok: false as const,
      error: { code: 'INVALID_INPUT', message: parseResult.error.errors[0]?.message || 'Invalid input' },
      httpStatus: 400 as const,
    };
  }

  const { reason, description } = parseResult.data;

  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) {
    return { ok: false as const, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }, httpStatus: 404 as const };
  }

  if (order.userId !== user.id) {
    return {
      ok: false as const,
      error: { code: 'FORBIDDEN', message: 'Only order owner can report an issue' },
      httpStatus: 403 as const,
    };
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

  return { ok: true as const, issueId, status: 'open' as const };
}

// POST /api/orders/:id/issue and /api/orders/:id/report
orderRoutes.post('/:id/issue', async (c) => {
  const result = await handleIssueOrReport(
    c.get('db'),
    c.req.param('id'),
    c.get('user')!,
    await c.req.json().catch(() => ({}))
  );
  if (!result.ok) return c.json({ error: result.error }, result.httpStatus);
  return c.json(result);
});

orderRoutes.post('/:id/report', async (c) => {
  const result = await handleIssueOrReport(
    c.get('db'),
    c.req.param('id'),
    c.get('user')!,
    await c.req.json().catch(() => ({}))
  );
  if (!result.ok) return c.json({ error: result.error }, result.httpStatus);
  return c.json(result);
});
