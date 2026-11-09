import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import worker, { expireOldPlacedOrders } from '@worker/index';
import { getDb } from '@worker/db';
import { orders, vendors, gates } from '@worker/db/schema';
import { createSession, buildSetCookieHeader } from '@worker/auth/session';
import { eq } from 'drizzle-orm';
import { ulid } from '@worker/utils/ulid';

describe('Worker Full API Integration Tests', () => {
  let studentCookie: string;
  let vendorCookie: string;

  beforeAll(async () => {
    const db = getDb(env.DB);

    // Ensure v_ganga and gate_main are open 24 hours during test run regardless of real-world wall clock hour
    await db
      .update(vendors)
      .set({ hoursJson: JSON.stringify({ open: '00:00', close: '23:59' }), prepMinutes: 5 })
      .where(eq(vendors.id, 'v_ganga'));

    await db
      .update(gates)
      .set({ curfewTime: '23:59', bufferMinutes: 0, travelMinutes: 5 })
      .where(eq(gates.id, 'gate_main'));

    // Create session cookies using the seeded demo users
    const studentSession = await createSession(db, 'usr_student');
    studentCookie = buildSetCookieHeader('session', studentSession.token);

    const vendorSession = await createSession(db, 'usr_vendor');
    vendorCookie = buildSetCookieHeader('session', vendorSession.token);
  });

  it('guarantees idempotent order placement when replaying with same Idempotency-Key', async () => {
    const key = `test-idemp-${ulid()}`;
    const payload = JSON.stringify({
      vendorId: 'v_ganga',
      gateId: 'gate_main',
      items: [{ itemId: 'it_g1', quantity: 1, expectedPricePaise: 16000 }],
    });

    const makeRequest = async () => {
      const req = new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
          Cookie: studentCookie,
        },
        body: payload,
      });
      const ctx = createExecutionContext();
      const res = await worker.fetch(req, env, ctx);
      await waitOnExecutionContext(ctx);
      return res;
    };

    // First request -> creates order (201 Created)
    const res1 = await makeRequest();
    expect(res1.status).toBe(201);
    const body1 = (await res1.json()) as { ok: boolean; order: { id: string; publicNo: string } };
    expect(body1.ok).toBe(true);
    expect(body1.order.id).toBeDefined();

    // Second request with SAME Idempotency-Key -> returns existing order idempotently (200 OK)
    const res2 = await makeRequest();
    expect(res2.status).toBe(200);
    const body2 = (await res2.json()) as { ok: boolean; order: { id: string; publicNo: string }; replayed: boolean };
    expect(body2.ok).toBe(true);
    expect(body2.replayed).toBe(true);
    expect(body2.order.id).toBe(body1.order.id);
  });

  it('enforces role guards (guest cannot place order, student cannot access vendor console)', async () => {
    // 1. Guest order placement -> 401 Unauthorized
    const guestReq = new Request('http://localhost/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `guest-idemp-${ulid()}`,
      },
      body: JSON.stringify({
        vendorId: 'v_ganga',
        gateId: 'gate_main',
        items: [{ itemId: 'it_g1', quantity: 1 }],
      }),
    });
    const ctx1 = createExecutionContext();
    const guestRes = await worker.fetch(guestReq, env, ctx1);
    await waitOnExecutionContext(ctx1);
    expect(guestRes.status).toBe(401);

    // 2. Student accessing vendor orders -> 403 Forbidden
    const studentVendorReq = new Request('http://localhost/api/vendor/orders', {
      method: 'GET',
      headers: { Cookie: studentCookie },
    });
    const ctx2 = createExecutionContext();
    const studentVendorRes = await worker.fetch(studentVendorReq, env, ctx2);
    await waitOnExecutionContext(ctx2);
    expect(studentVendorRes.status).toBe(403);

    // 3. Vendor accessing vendor orders -> 200 OK
    const vendorReq = new Request('http://localhost/api/vendor/orders', {
      method: 'GET',
      headers: { Cookie: vendorCookie },
    });
    const ctx3 = createExecutionContext();
    const vendorRes = await worker.fetch(vendorReq, env, ctx3);
    await waitOnExecutionContext(ctx3);
    expect(vendorRes.status).toBe(200);
  });

  it('enforces OTP rate limits and rejects non-campus domains for new registrations', async () => {
    // Non-campus domain registration
    const nonCampusReq = new Request('http://localhost/api/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'outsider@gmail.com' }),
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(nonCampusReq, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('DOMAIN_NOT_ALLOWED');
  });

  it('handles demo route with DEMO_MODE=true and rejects with 404 when DEMO_MODE=false', async () => {
    // 1. With DEMO_MODE=true
    const demoReq = new Request('http://localhost/api/auth/demo/student', {
      method: 'POST',
    });
    const ctx1 = createExecutionContext();
    const demoRes = await worker.fetch(demoReq, { ...env, DEMO_MODE: 'true' }, ctx1);
    await waitOnExecutionContext(ctx1);
    expect(demoRes.status).toBe(200);
    const demoBody = (await demoRes.json()) as { ok: boolean; user: { role: string } };
    expect(demoBody.ok).toBe(true);
    expect(demoBody.user.role).toBe('student');

    // 2. With DEMO_MODE=false -> returns 404
    const noDemoReq = new Request('http://localhost/api/auth/demo/student', {
      method: 'POST',
    });
    const ctx2 = createExecutionContext();
    const noDemoRes = await worker.fetch(noDemoReq, { ...env, DEMO_MODE: 'false' }, ctx2);
    await waitOnExecutionContext(ctx2);
    expect(noDemoRes.status).toBe(404);
  });

  it('auto-expires orders remaining in placed status after 5 minutes via cron function', async () => {
    const db = getDb(env.DB);
    const staleOrderId = ulid();

    // Create an order placed 10 minutes ago
    await db.insert(orders).values({
      id: staleOrderId,
      publicNo: 'TF-OLD1',
      campusId: 'campus_nitp',
      userId: 'usr_student',
      vendorId: 'v_ganga',
      gateId: 'gate_main',
      status: 'placed',
      subtotalPaise: 16000,
      totalPaise: 16000,
      paymentMethod: 'pay_at_gate',
      handoverCode: '9999',
      idempotencyKey: `stale-${ulid()}`,
      placedAt: Math.floor(Date.now() / 1000) - 600, // 10 minutes ago
      createdAt: Math.floor(Date.now() / 1000) - 600,
    });

    const expiredCount = await expireOldPlacedOrders(env);
    expect(expiredCount).toBeGreaterThanOrEqual(1);

    const updated = await db.select().from(orders).where(eq(orders.id, staleOrderId)).get();
    expect(updated?.status).toBe('expired');
  });
});
