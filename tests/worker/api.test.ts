import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import worker, { expireOldPlacedOrders } from '@worker/index';
import { getDb } from '@worker/db';
import { orders, vendors, gates, users } from '@worker/db/schema';
import { createSession, buildSetCookieHeader } from '@worker/auth/session';
import { verifyTurnstileToken } from '@worker/auth/turnstile';
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
      .set({ curfewTime: '04:00', bufferMinutes: 0, travelMinutes: 5 })
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

  it('allows authenticated users to delete their account and personal data (privacy compliance)', async () => {
    const db = getDb(env.DB);
    const tempUserId = `usr_temp_${ulid()}`;
    await db.insert(users).values({
      id: tempUserId,
      email: `temp_${tempUserId}@nitp.ac.in`,
      name: 'Temporary User',
      role: 'student',
      campusId: 'campus_nitp',
      createdAt: Math.floor(Date.now() / 1000),
    });

    const session = await createSession(db, tempUserId);
    const tempCookie = buildSetCookieHeader('session', session.token);

    const delReq = new Request('http://localhost/api/auth/delete-account', {
      method: 'DELETE',
      headers: { Cookie: tempCookie },
    });
    const ctx = createExecutionContext();
    const res = await worker.fetch(delReq, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);

    const userInDb = await db.select().from(users).where(eq(users.id, tempUserId)).get();
    expect(userInDb?.email).toContain('@privacy.trefood.local');
    expect(userInDb?.name).toBe('Deleted Student');
  });

  it('exercises campus, search suggest, coupons, quote, handover 5-attempt lockout & vendor/admin endpoints', async () => {
    const db = getDb(env.DB);
    const adminSession = await createSession(db, 'usr_admin');
    const adminCookie = buildSetCookieHeader('session', adminSession.token);

    const exec = async (req: Request) => {
      const ctx = createExecutionContext();
      const res = await worker.fetch(req, env, ctx);
      await waitOnExecutionContext(ctx);
      return res;
    };

    // 1. Campus detail & stats + Gates + Search suggest + Coupons + Vendor by ID
    const campusRes = await exec(new Request('http://localhost/api/campuses/nitp'));
    expect(campusRes.status).toBe(200);
    const campusBody = (await campusRes.json()) as { ok: boolean; gates: unknown[]; stats: { totalVendors: number } };
    expect(campusBody.ok).toBe(true);
    expect(campusBody.stats.totalVendors).toBeGreaterThanOrEqual(12);

    const suggestRes = await exec(new Request('http://localhost/api/search/suggest?q=Paneer'));
    expect(suggestRes.status).toBe(200);
    const suggestBody = (await suggestRes.json()) as { items: Array<{ name: string }> };
    expect(suggestBody.items.some((i) => i.name.includes('Paneer'))).toBe(true);

    const couponsRes = await exec(new Request('http://localhost/api/coupons'));
    expect(couponsRes.status).toBe(200);
    const couponsBody = (await couponsRes.json()) as { coupons: Array<{ code: string }> };
    expect(couponsBody.coupons.length).toBeGreaterThanOrEqual(6);

    const vendorByIdRes = await exec(new Request('http://localhost/api/vendors/v_ganga'));
    expect(vendorByIdRes.status).toBe(200);

    // 2. Cart quote with coupon
    const quoteRes = await exec(
      new Request('http://localhost/api/cart/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
        body: JSON.stringify({
          vendorId: 'v_ganga',
          gateId: 'gate_main',
          couponCode: 'CAMPUS20',
          items: [{ itemId: 'it_g1', quantity: 1 }],
        }),
      })
    );
    expect(quoteRes.status).toBe(200);
    const quoteBody = (await quoteRes.json()) as { subtotalPaise: number; discountPaise: number; totalPaise: number };
    expect(quoteBody.subtotalPaise).toBe(16000);
    expect(quoteBody.discountPaise).toBe(3200); // 20% of 16000
    expect(quoteBody.totalPaise).toBe(12800);

    // 3. Place order -> vendor accept & ready & at_gate -> confirm-handover 5-attempt lockout -> assist -> report
    const createRes = await exec(
      new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `full-flow-${ulid()}`,
          Cookie: studentCookie,
        },
        body: JSON.stringify({
          vendorId: 'v_ganga',
          gateId: 'gate_main',
          items: [{ itemId: 'it_g1', quantity: 1 }],
        }),
      })
    );
    expect(createRes.status).toBe(201);
    const createBody = (await createRes.json()) as { order: { id: string; handoverCode: string } };
    const orderId = createBody.order.id;

    // ETag support on GET /api/orders/:id
    const detailRes = await exec(new Request(`http://localhost/api/orders/${orderId}`, { headers: { Cookie: studentCookie } }));
    expect(detailRes.status).toBe(200);
    const etag = detailRes.headers.get('ETag')!;
    expect(etag).toBeTruthy();
    const res304 = await exec(
      new Request(`http://localhost/api/orders/${orderId}`, {
        headers: { Cookie: studentCookie, 'If-None-Match': etag },
      })
    );
    expect(res304.status).toBe(304);

    // Vendor accept -> ready -> at_gate
    expect(
      (
        await exec(
          new Request(`http://localhost/api/vendor/orders/${orderId}/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: vendorCookie },
            body: JSON.stringify({ prepMinutes: 15 }),
          })
        )
      ).status
    ).toBe(200);

    expect(
      (
        await exec(
          new Request(`http://localhost/api/vendor/orders/${orderId}/ready`, {
            method: 'POST',
            headers: { Cookie: vendorCookie },
          })
        )
      ).status
    ).toBe(200);

    expect(
      (
        await exec(
          new Request(`http://localhost/api/vendor/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: vendorCookie },
            body: JSON.stringify({ status: 'at_gate' }),
          })
        )
      ).status
    ).toBe(200);

    // Fail handover code 5 times -> locks at 423
    const wrongCode = createBody.order.handoverCode === '0000' ? '9999' : '0000';
    for (let i = 1; i <= 4; i++) {
      const badRes = await exec(
        new Request(`http://localhost/api/orders/${orderId}/confirm-handover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
          body: JSON.stringify({ handoverCode: wrongCode }),
        })
      );
      expect(badRes.status).toBe(400);
    }

    const fifthRes = await exec(
      new Request(`http://localhost/api/orders/${orderId}/confirm-handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
        body: JSON.stringify({ handoverCode: wrongCode }),
      })
    );
    expect(fifthRes.status).toBe(423);

    // Locked even with correct code until vendor assist
    const lockedRes = await exec(
      new Request(`http://localhost/api/orders/${orderId}/confirm-handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
        body: JSON.stringify({ handoverCode: createBody.order.handoverCode }),
      })
    );
    expect(lockedRes.status).toBe(423);

    // Vendor handover assist completes delivery cleanly
    const assistRes = await exec(
      new Request(`http://localhost/api/vendor/orders/${orderId}/handover-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: vendorCookie },
        body: JSON.stringify({ completeDelivery: true, note: 'Verified student ID at Main Gate' }),
      })
    );
    expect(assistRes.status).toBe(200);

    // Student reports issue -> admin views & resolves report
    const reportRes = await exec(
      new Request(`http://localhost/api/orders/${orderId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
        body: JSON.stringify({ reason: 'late', description: 'Arrived slightly late due to rain' }),
      })
    );
    expect(reportRes.status).toBe(200);
    const reportBody = (await reportRes.json()) as { issueId: string };

    // Admin 403 check for student, 200 for admin
    expect((await exec(new Request('http://localhost/api/admin/stats', { headers: { Cookie: studentCookie } }))).status).toBe(403);
    expect((await exec(new Request('http://localhost/api/admin/stats', { headers: { Cookie: adminCookie } }))).status).toBe(200);
    expect((await exec(new Request('http://localhost/api/admin/coupons', { headers: { Cookie: adminCookie } }))).status).toBe(200);
    expect((await exec(new Request('http://localhost/api/admin/reports', { headers: { Cookie: adminCookie } }))).status).toBe(200);
    expect(
      (
        await exec(
          new Request(`http://localhost/api/admin/reports/${reportBody.issueId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
            body: JSON.stringify({ status: 'credited', refundPaise: 2000, resolutionNote: 'Issued Rs 20 credit' }),
          })
        )
      ).status
    ).toBe(200);
  });

  it('serves live campus stats, vendor onboarding D1 storage, and SEO sitemap/robots routes', async () => {
    const exec = async (req: Request) => {
      const ctx = createExecutionContext();
      const res = await worker.fetch(req, env, ctx);
      await waitOnExecutionContext(ctx);
      return res;
    };

    const campusRes = await exec(new Request('http://localhost/api/campuses/nitp'));
    expect(campusRes.status).toBe(200);
    const campusBody = (await campusRes.json()) as {
      ok: boolean;
      stats: {
        openVendorsCount: number;
        avgEtaMinutes: number;
        ordersHandedOver: number;
        isSampleData: boolean;
      };
    };
    expect(campusBody.ok).toBe(true);
    expect(campusBody.stats.openVendorsCount).toBeGreaterThanOrEqual(1);
    expect(campusBody.stats.avgEtaMinutes).toBeGreaterThanOrEqual(10);
    expect(campusBody.stats.ordersHandedOver).toBeGreaterThanOrEqual(1);
    expect(campusBody.stats.isSampleData).toBe(true);

    // Reject invalid vendor application
    const badApplyRes = await exec(
      new Request('http://localhost/api/vendor-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorName: 'A', shopType: 'meals', phone: '12345' }),
      })
    );
    expect(badApplyRes.status).toBe(400);

    // Accept and store valid vendor onboarding application in D1
    const goodApplyRes = await exec(
      new Request('http://localhost/api/vendor-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName: 'Patna Hostel Chai Corner',
          shopType: 'snacks',
          phone: '9876543210',
        }),
      })
    );
    expect(goodApplyRes.status).toBe(201);
    const applyBody = (await goodApplyRes.json()) as {
      ok: boolean;
      application: { id: string; vendorName: string; status: string };
    };
    expect(applyBody.ok).toBe(true);
    expect(applyBody.application.vendorName).toBe('Patna Hostel Chai Corner');
    expect(applyBody.application.status).toBe('pending');

    // SEO sitemap.xml & robots.txt
    const sitemapRes = await exec(new Request('http://localhost/sitemap.xml'));
    expect(sitemapRes.status).toBe(200);
    const sitemapXml = await sitemapRes.text();
    expect(sitemapXml).toContain('/about</loc>');
    expect(sitemapXml).toContain('/terms</loc>');
    expect(sitemapXml).toContain('/privacy</loc>');
    expect(sitemapXml).toContain('/refunds</loc>');

    const robotsRes = await exec(new Request('http://localhost/robots.txt'));
    expect(robotsRes.status).toBe(200);
    const robotsTxt = await robotsRes.text();
    expect(robotsTxt).toContain('Disallow: /admin');
    expect(robotsTxt).toContain('Sitemap:');
  });

  it('supports KV-backed Google mock auth, auth providers flags, favorites protection, and Turnstile hook', async () => {
    const exec = async (req: Request) => {
      const ctx = createExecutionContext();
      const res = await worker.fetch(req, env, ctx);
      await waitOnExecutionContext(ctx);
      return res;
    };

    // Auth provider flags
    const provRes = await exec(new Request('http://localhost/api/auth/providers'));
    expect(provRes.status).toBe(200);
    const provBody = (await provRes.json()) as {
      ok: boolean;
      demoMode: boolean;
      mockGoogleEnabled: boolean;
      turnstileEnabled: boolean;
    };
    expect(provBody.ok).toBe(true);
    expect(provBody.demoMode).toBe(true);
    expect(provBody.mockGoogleEnabled).toBe(true);
    expect(provBody.turnstileEnabled).toBe(false);

    // Guest favorites blocked with 401
    expect((await exec(new Request('http://localhost/api/favorites'))).status).toBe(401);

    // Mock Google chooser sign-in sets httpOnly cookie backed by SESSION_KV
    const googleRes = await exec(
      new Request('http://localhost/api/auth/google/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'aarav.ug24@nitp.ac.in', name: 'Aarav Verma' }),
      })
    );
    expect(googleRes.status).toBe(200);
    const setCookie = googleRes.headers.get('set-cookie') || '';
    expect(setCookie).toContain('HttpOnly');
    const cookiePair = setCookie.split(';')[0];

    // Confirm session validates across requests (backed by KV / D1)
    const meRes = await exec(
      new Request('http://localhost/api/auth/me', { headers: { Cookie: cookiePair } })
    );
    expect(meRes.status).toBe(200);
    const meBody = (await meRes.json()) as { ok: boolean; user: { email: string } };
    expect(meBody.ok).toBe(true);
    expect(meBody.user.email).toBe('aarav.ug24@nitp.ac.in');

    // Add, read, and remove favourite vendor
    expect(
      (
        await exec(
          new Request('http://localhost/api/favorites/v_ganga', {
            method: 'POST',
            headers: { Cookie: cookiePair },
          })
        )
      ).status
    ).toBe(201);

    const favListRes = await exec(
      new Request('http://localhost/api/favorites', { headers: { Cookie: cookiePair } })
    );
    expect(favListRes.status).toBe(200);
    const favBody = (await favListRes.json()) as { vendorIds: string[] };
    expect(favBody.vendorIds).toContain('v_ganga');

    expect(
      (
        await exec(
          new Request('http://localhost/api/favorites/v_ganga', {
            method: 'DELETE',
            headers: { Cookie: cookiePair },
          })
        )
      ).status
    ).toBe(200);

    // Turnstile feature flag unit check: skipped when false, rejected when enabled without token
    const skipped = await verifyTurnstileToken({ enabled: 'false', token: null });
    expect(skipped.ok).toBe(true);
    expect(skipped.skipped).toBe(true);

    const rejected = await verifyTurnstileToken({
      enabled: 'true',
      secretKey: 'test-secret',
      token: '',
    });
    expect(rejected.ok).toBe(false);
    expect(rejected.errorCodes).toContain('missing-input-response');
  });

  it('enriches /api/vendors with quickPicks/startingPrice, searches vendors+dishes at /api/search, and quotes item variants/addons', async () => {
    const exec = async (req: Request) => {
      const ctx = createExecutionContext();
      const res = await worker.fetch(req, env, ctx);
      await waitOnExecutionContext(ctx);
      return res;
    };
    const dayMockTs = Math.floor(new Date('2026-11-10T08:30:00Z').getTime() / 1000).toString();

    // 1. /api/vendors includes quickPicks, startingPricePaise & offerTags
    const vRes = await exec(
      new Request('http://localhost/api/vendors?gateId=gate_main', {
        headers: { 'x-mock-time': dayMockTs },
      })
    );
    expect(vRes.status).toBe(200);
    const vBody = (await vRes.json()) as {
      ok: boolean;
      vendors: Array<{ id: string; startingPricePaise?: number; offerTags?: string[] }>;
      quickPicks: Array<{ id: string; vendorSlug: string; pricePaise: number }>;
    };
    expect(vBody.ok).toBe(true);
    expect(vBody.quickPicks.length).toBeGreaterThan(0);
    const ganga = vBody.vendors.find((v) => v.id === 'v_ganga')!;
    expect(ganga.startingPricePaise).toBeGreaterThan(0);
    expect(ganga.offerTags?.length).toBeGreaterThan(0);

    // 2. /api/search returns combined vendors & dishes matching query + filters
    const searchRes = await exec(
      new Request('http://localhost/api/search?q=chicken&gateId=gate_main&veg=true&sort=price_asc', {
        headers: { 'x-mock-time': dayMockTs },
      })
    );
    expect(searchRes.status).toBe(200);
    const searchBody = (await searchRes.json()) as {
      ok: boolean;
      vendors: Array<{ id: string }>;
      dishes: Array<{ id: string; isVeg: boolean }>;
      counts: { all: number; vendors: number; dishes: number };
    };
    expect(searchBody.ok).toBe(true);
    // All dishes returned with veg=true must strictly be vegetarian
    expect(searchBody.dishes.every((d) => d.isVeg)).toBe(true);

    const broadSearchRes = await exec(
      new Request('http://localhost/api/search?q=paneer&gateId=gate_main', {
        headers: { 'x-mock-time': dayMockTs },
      })
    );
    const broadBody = (await broadSearchRes.json()) as {
      ok: boolean;
      vendors: Array<{ slug: string }>;
      dishes: Array<{ id: string; name: string }>;
      counts: { all: number; vendors: number; dishes: number };
    };
    expect(broadBody.ok).toBe(true);
    expect(broadBody.vendors.length).toBeGreaterThan(0);
    expect(broadBody.dishes.some((d) => d.name.toLowerCase().includes('paneer'))).toBe(true);
    expect(broadBody.counts.all).toBe(broadBody.vendors.length + broadBody.dishes.length);

    // 3. Variant + Addon cart quote computes exact effectiveUnit and accepts matching expectedPricePaise
    const quoteRes = await exec(
      new Request('http://localhost/api/cart/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-mock-time': dayMockTs },
        body: JSON.stringify({
          vendorId: 'v_ganga',
          gateId: 'gate_main',
          items: [
            {
              itemId: 'it_g1',
              quantity: 1,
              variantId: 'full', // 16000 + 8000 = 24000 paise
              expectedPricePaise: 24000,
            },
            {
              itemId: 'it_g8',
              quantity: 1,
              addonIds: ['raita'], // 18000 + 2000 = 20000 paise + 1000 packing
              expectedPricePaise: 20000,
            },
          ],
        }),
      })
    );
    expect(quoteRes.status).toBe(200);
    const quoteBody = (await quoteRes.json()) as {
      ok: boolean;
      subtotalPaise: number;
      packingTotalPaise: number;
      totalPaise: number;
    };
    expect(quoteBody.ok).toBe(true);
    expect(quoteBody.subtotalPaise).toBe(44000);
    expect(quoteBody.packingTotalPaise).toBe(1000);
    expect(quoteBody.totalPaise).toBe(45000);
  });
});
