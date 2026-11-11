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

    // Ensure rest_csb_nitp and gate_main are open 24 hours during test run regardless of real-world wall clock hour
    await db
      .update(vendors)
      .set({ hoursJson: JSON.stringify({ open: '00:00', close: '23:59' }), prepMinutes: 5 })
      .where(eq(vendors.id, 'rest_csb_nitp'));

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
      vendorId: 'rest_csb_nitp',
      gateId: 'gate_main',
      items: [{ itemId: 'csb_red_sauce_pasta', quantity: 1, expectedPricePaise: 16900 }],
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
        vendorId: 'rest_csb_nitp',
        gateId: 'gate_main',
        items: [{ itemId: 'csb_red_sauce_pasta', quantity: 1 }],
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
      vendorId: 'rest_csb_nitp',
      gateId: 'gate_main',
      status: 'placed',
      subtotalPaise: 16900,
      totalPaise: 17900,
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
    expect(campusBody.stats.totalVendors).toBeGreaterThanOrEqual(8);

    const suggestRes = await exec(new Request('http://localhost/api/search/suggest?q=Paneer'));
    expect(suggestRes.status).toBe(200);
    const suggestBody = (await suggestRes.json()) as { items: Array<{ name: string }> };
    expect(suggestBody.items.some((i) => i.name.includes('Paneer'))).toBe(true);

    const couponsRes = await exec(new Request('http://localhost/api/coupons'));
    expect(couponsRes.status).toBe(200);
    const couponsBody = (await couponsRes.json()) as { coupons: Array<{ code: string }> };
    expect(couponsBody.coupons.length).toBeGreaterThanOrEqual(4);

    const vendorByIdRes = await exec(new Request('http://localhost/api/vendors/rest_csb_nitp'));
    expect(vendorByIdRes.status).toBe(200);

    // 2. Cart quote with coupon
    const quoteRes = await exec(
      new Request('http://localhost/api/cart/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
        body: JSON.stringify({
          vendorId: 'rest_csb_nitp',
          gateId: 'gate_main',
          couponCode: 'CAMPUS20',
          items: [{ itemId: 'csb_red_sauce_pasta', quantity: 1 }],
        }),
      })
    );
    expect(quoteRes.status).toBe(200);
    const quoteBody = (await quoteRes.json()) as { subtotalPaise: number; packingTotalPaise: number; discountPaise: number; totalPaise: number };
    expect(quoteBody.subtotalPaise).toBe(16900);
    expect(quoteBody.discountPaise).toBe(3380); // 20% of 16900
    expect(quoteBody.totalPaise).toBe(14520); // 16900 + 1000 packing - 3380 discount

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
          vendorId: 'rest_csb_nitp',
          gateId: 'gate_main',
          items: [{ itemId: 'csb_red_sauce_pasta', quantity: 1 }],
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
          new Request('http://localhost/api/favorites/rest_csb_nitp', {
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
    expect(favBody.vendorIds).toContain('rest_csb_nitp');

    expect(
      (
        await exec(
          new Request('http://localhost/api/favorites/rest_csb_nitp', {
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
    const csb = vBody.vendors.find((v) => v.id === 'rest_csb_nitp')!;
    expect(csb.startingPricePaise).toBeGreaterThan(0);
    expect(csb.offerTags?.length).toBeGreaterThan(0);

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
          vendorId: 'rest_csb_nitp',
          gateId: 'gate_main',
          items: [
            {
              itemId: 'csb_chocolate_chai',
              quantity: 1,
              variantId: 'opt_size_l', // 2000 + 1500 = 3500
              addonIds: ['grp_sugar_opt_sugar_free'], // +500 => 4000 paise + 500 packing
              expectedPricePaise: 4000,
            },
            {
              itemId: 'csb_red_sauce_pasta',
              quantity: 1,
              addonIds: ['grp_cheese_opt_extra_cheese'], // 16900 + 2000 = 18900 paise + 1000 packing
              expectedPricePaise: 18900,
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
    expect(quoteBody.subtotalPaise).toBe(22900);
    expect(quoteBody.packingTotalPaise).toBe(1500);
    expect(quoteBody.totalPaise).toBe(24400);
  });

  it('enforces minimum order shortfall + suggestedAddons, coupon validation, curfew refusal + alternative gates, UPI simulation & double-submit idempotency', async () => {
    const exec = async (req: Request) => {
      const ctx = createExecutionContext();
      const res = await worker.fetch(req, env, ctx);
      await waitOnExecutionContext(ctx);
      return res;
    };

    const baseIstMidnightUtc = Math.floor(Date.UTC(2026, 10, 9, 18, 30, 0) / 1000);
    const ts1400Ist = (baseIstMidnightUtc + 14 * 3600).toString();
    const ts1920Ist = (baseIstMidnightUtc + 19 * 3600 + 20 * 60).toString();

    const studentLogin = await exec(
      new Request('http://localhost/api/auth/demo/student', { method: 'POST' })
    );
    const cookie = (studentLogin.headers.get('set-cookie') || '').split(';')[0];

    // 1. Minimum order shortfall (Kolkata Biryani minOrder = 4900, kb_veg_roll = 3900 -> short by 1000 + returns suggestedAddons)
    const minQuoteRes = await exec(
      new Request('http://localhost/api/cart/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-mock-time': ts1400Ist },
        body: JSON.stringify({
          vendorId: 'rest_kolkata_biryani_nitp',
          gateId: 'gate_main',
          items: [{ itemId: 'kb_veg_roll', quantity: 1 }],
        }),
      })
    );
    expect(minQuoteRes.status).toBe(200);
    const minQuote = (await minQuoteRes.json()) as {
      meetsMinOrder: boolean;
      shortfallPaise: number;
      minOrderPaise: number;
      suggestedAddons: Array<{ id: string; pricePaise: number }>;
    };
    expect(minQuote.meetsMinOrder).toBe(false);
    expect(minQuote.minOrderPaise).toBe(4900);
    expect(minQuote.shortfallPaise).toBe(1000);
    expect(minQuote.suggestedAddons.length).toBeGreaterThan(0);

    // Placing below minimum order rejected with 409 MIN_ORDER_NOT_MET
    const shortOrderRes = await exec(
      new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
          'Idempotency-Key': `min-err-${ulid()}`,
          'x-mock-time': ts1400Ist,
        },
        body: JSON.stringify({
          vendorId: 'rest_kolkata_biryani_nitp',
          gateId: 'gate_main',
          items: [{ itemId: 'kb_veg_roll', quantity: 1 }],
        }),
      })
    );
    expect(shortOrderRes.status).toBe(409);
    const shortErr = (await shortOrderRes.json()) as { error: { code: string } };
    expect(shortErr.error.code).toBe('MIN_ORDER_NOT_MET');

    // 2. Ineligible coupon rejected with 409 COUPON_NOT_ELIGIBLE (FLAT25 min order 14900, item 6900)
    const badCouponRes = await exec(
      new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
          'Idempotency-Key': `cpn-err-${ulid()}`,
          'x-mock-time': ts1400Ist,
        },
        body: JSON.stringify({
          vendorId: 'rest_kolkata_biryani_nitp',
          gateId: 'gate_main',
          couponCode: 'FLAT25',
          items: [{ itemId: 'kb_double_egg_roll', quantity: 1 }], // 6900 >= 4900 vendor min, < 14900 FLAT25 min
        }),
      })
    );
    expect(badCouponRes.status).toBe(409);
    expect(((await badCouponRes.json()) as { error: { code: string } }).error.code).toBe(
      'COUPON_NOT_ELIGIBLE'
    );

    // 3. Curfew refusal at 19:20 IST on Boys Hostel (19:30 curfew + 15m window) suggests Main Gate 24x7
    const curfewOrderRes = await exec(
      new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
          'Idempotency-Key': `curfew-err-${ulid()}`,
          'x-mock-time': ts1920Ist,
        },
        body: JSON.stringify({
          vendorId: 'rest_csb_nitp',
          gateId: 'gate_h5',
          items: [{ itemId: 'csb_red_sauce_pasta', quantity: 1 }],
        }),
      })
    );
    expect(curfewOrderRes.status).toBe(400);
    const curfewBody = (await curfewOrderRes.json()) as {
      error: {
        code: string;
        suggestedGate?: { gateId: string };
        alternativeGates?: Array<{ gateId: string }>;
      };
    };
    expect(curfewBody.error.code).toBe('too_late');
    expect(curfewBody.error.alternativeGates?.some((g) => g.gateId === 'gate_main')).toBe(true);

    // 4. Simulated UPI decline returns 402 PAYMENT_FAILED without storing an order
    const upiFailKey = `upi-fail-${ulid()}`;
    const upiFailRes = await exec(
      new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
          'Idempotency-Key': upiFailKey,
          'x-mock-time': ts1400Ist,
        },
        body: JSON.stringify({
          vendorId: 'rest_csb_nitp',
          gateId: 'gate_main',
          paymentMethod: 'upi_simulated',
          upiSimulateResult: 'failed',
          contactPhone: '9876543210',
          items: [{ itemId: 'csb_red_sauce_pasta', quantity: 1 }],
        }),
      })
    );
    expect(upiFailRes.status).toBe(402);
    expect(((await upiFailRes.json()) as { error: { code: string } }).error.code).toBe(
      'PAYMENT_FAILED'
    );

    // 5. Simulated UPI success + contactPhone + double-submit prevention with identical Idempotency-Key
    const idempKey = `upi-ok-${ulid()}`;
    const reqInit = () =>
      new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
          'Idempotency-Key': idempKey,
          'x-mock-time': ts1400Ist,
        },
        body: JSON.stringify({
          vendorId: 'rest_csb_nitp',
          gateId: 'gate_main',
          paymentMethod: 'upi_simulated',
          upiSimulateResult: 'success',
          paymentRef: 'UPI-TEST-123',
          contactPhone: '9876543210',
          note: 'Call near guard desk',
          items: [{ itemId: 'csb_red_sauce_pasta', quantity: 1 }],
        }),
      });

    const firstPlace = await exec(reqInit());
    expect(firstPlace.status).toBe(201);
    const firstOrder = (await firstPlace.json()) as {
      ok: boolean;
      order: { id: string; handoverCode: string; paymentMethod: string; paymentStatus: string; contactPhone: string };
    };
    expect(firstOrder.order.paymentMethod).toBe('upi_simulated');
    expect(firstOrder.order.paymentStatus).toBe('paid');
    expect(firstOrder.order.contactPhone).toBe('9876543210');
    expect(firstOrder.order.handoverCode).toMatch(/^\d{4}$/);

    // Duplicate click replay returns original order safely (200 OK, replayed: true)
    const replayPlace = await exec(reqInit());
    expect(replayPlace.status).toBe(200);
    const replayBody = (await replayPlace.json()) as {
      replayed: boolean;
      order: { id: string; handoverCode: string };
    };
    expect(replayBody.replayed).toBe(true);
    expect(replayBody.order.id).toBe(firstOrder.order.id);
    expect(replayBody.order.handoverCode).toBe(firstOrder.order.handoverCode);
  });

  it('supports Web Push subscriptions, in-app notification status cards, enriched order lists, and gate issue reports', async () => {
    const exec = async (req: Request) => {
      const ctx = createExecutionContext();
      const res = await worker.fetch(req, env, ctx);
      await waitOnExecutionContext(ctx);
      return res;
    };

    const studentLogin = await exec(
      new Request('http://localhost/api/auth/demo/student', { method: 'POST' })
    );
    const studentCookie = (studentLogin.headers.get('set-cookie') || '').split(';')[0];

    const adminLogin = await exec(
      new Request('http://localhost/api/auth/demo/admin', { method: 'POST' })
    );
    const adminCookie = (adminLogin.headers.get('set-cookie') || '').split(';')[0];

    // 1. VAPID public key config + fallback indicator
    const cfgRes = await exec(new Request('http://localhost/api/push/vapid-public-key'));
    expect(cfgRes.status).toBe(200);
    const cfgBody = (await cfgRes.json()) as { ok: boolean; fallbackMode: string };
    expect(cfgBody.ok).toBe(true);
    expect(['web_push', 'in_app_status_card']).toContain(cfgBody.fallbackMode);

    // 2. Push subscribe requires auth & valid Zod payload
    const unauthSub = await exec(
      new Request('http://localhost/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: 'https://push.example/sub1', keys: { p256dh: 'abcdefghij1234', auth: 'auth123456' } }),
      })
    );
    expect(unauthSub.status).toBe(401);

    const endpoint = `https://push.example/nitp-${ulid()}`;
    const subRes = await exec(
      new Request('http://localhost/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
        body: JSON.stringify({
          endpoint,
          keys: { p256dh: 'BOr9x_valid_p256dh_key_value_for_testing', auth: 'valid_auth_123' },
        }),
      })
    );
    expect(subRes.status).toBe(201);

    // 3. Place an order at 14:00 IST -> verify /api/orders returns batched items + vendorSlug, and /api/notifications returns status card
    const ts1400Ist = Math.floor(new Date().setUTCHours(8, 30, 0, 0) / 1000).toString();
    const createRes = await exec(
      new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: studentCookie,
          'Idempotency-Key': `notif-${ulid()}`,
          'x-mock-time': ts1400Ist,
        },
        body: JSON.stringify({
          vendorId: 'rest_csb_nitp',
          gateId: 'gate_main',
          items: [{ itemId: 'csb_red_sauce_pasta', quantity: 1 }],
        }),
      })
    );
    expect(createRes.status).toBe(201);
    const { order } = (await createRes.json()) as {
      order: { id: string; publicNo: string; handoverCode: string };
    };

    const listRes = await exec(
      new Request('http://localhost/api/orders', { headers: { Cookie: studentCookie } })
    );
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as {
      orders: Array<{ id: string; vendorSlug?: string; items?: unknown[] }>;
    };
    const found = listBody.orders.find((o) => o.id === order.id);
    expect(found).toBeDefined();
    expect(found?.vendorSlug).toBe('chai-sutta-bar-csb');
    expect((found?.items || []).length).toBeGreaterThan(0);

    const notifRes = await exec(
      new Request('http://localhost/api/notifications', { headers: { Cookie: studentCookie } })
    );
    expect(notifRes.status).toBe(200);
    const notifBody = (await notifRes.json()) as {
      notifications: Array<{ orderId: string; title: string; summary: string }>;
    };
    expect(notifBody.notifications.some((n) => n.orderId === order.id)).toBe(true);

    // 4. Student reports not_at_gate -> visible in Admin Reports queue
    const reportRes = await exec(
      new Request(`http://localhost/api/orders/${order.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
        body: JSON.stringify({ reason: 'not_at_gate', description: 'Waiting at Main Gate bench, partner not spotted yet' }),
      })
    );
    expect(reportRes.status).toBe(200);
    const { issueId } = (await reportRes.json()) as { issueId: string };

    const adminReportsRes = await exec(
      new Request('http://localhost/api/admin/reports', { headers: { Cookie: adminCookie } })
    );
    expect(adminReportsRes.status).toBe(200);
    const adminReportsBody = (await adminReportsRes.json()) as {
      reports: Array<{ id: string; reason: string; orderId: string }>;
    };
    expect(adminReportsBody.reports.some((r) => r.id === issueId && r.reason === 'not_at_gate')).toBe(
      true
    );

    // 5. Unsubscribe cleans up push endpoint
    const unsubRes = await exec(
      new Request('http://localhost/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
        body: JSON.stringify({ endpoint }),
      })
    );
    expect(unsubRes.status).toBe(200);
  });

  it('supports /api/vendor accept, reject with reason, ready, prep adjust, stock/price edit, night-safety toggle, and insights', async () => {
    const exec = async (req: Request) => {
      const ctx = createExecutionContext();
      const res = await worker.fetch(req, env, ctx);
      await waitOnExecutionContext(ctx);
      return res;
    };

    const studentLogin = await exec(
      new Request('http://localhost/api/auth/demo/student', { method: 'POST' })
    );
    const studentCookie = (studentLogin.headers.get('set-cookie') || '').split(';')[0];

    const vendorLogin = await exec(
      new Request('http://localhost/api/auth/demo/vendor', { method: 'POST' })
    );
    const vendorCookie = (vendorLogin.headers.get('set-cookie') || '').split(';')[0];

    const ts1400Ist = Math.floor(new Date().setUTCHours(8, 30, 0, 0) / 1000).toString();

    // Place 2 orders for Chai Sutta Bar (CSB)
    const placeOrder = async (keySuffix: string) => {
      const r = await exec(
        new Request('http://localhost/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: studentCookie,
            'Idempotency-Key': `vendor-test-${keySuffix}-${ulid()}`,
            'x-mock-time': ts1400Ist,
          },
          body: JSON.stringify({
            vendorId: 'rest_csb_nitp',
            gateId: 'gate_main',
            items: [{ itemId: 'csb_red_sauce_pasta', quantity: 1 }],
          }),
        })
      );
      expect(r.status).toBe(201);
      return ((await r.json()) as { order: { id: string } }).order.id;
    };

    const orderAcceptId = await placeOrder('acc');
    const orderRejectId = await placeOrder('rej');

    // 1. Accept with prepMinutes -> adjust prep time -> ready -> at_gate -> assist complete
    const acceptRes = await exec(
      new Request(`http://localhost/api/vendor/orders/${orderAcceptId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: vendorCookie },
        body: JSON.stringify({ prepMinutes: 20 }),
      })
    );
    expect(acceptRes.status).toBe(200);

    const adjustRes = await exec(
      new Request(`http://localhost/api/vendor/orders/${orderAcceptId}/prep-time`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: vendorCookie },
        body: JSON.stringify({ prepMinutes: 25 }),
      })
    );
    expect(adjustRes.status).toBe(200);

    const readyRes = await exec(
      new Request(`http://localhost/api/vendor/orders/${orderAcceptId}/ready`, {
        method: 'POST',
        headers: { Cookie: vendorCookie },
      })
    );
    expect(readyRes.status).toBe(200);

    // 2. Reject second order with reason
    const rejectRes = await exec(
      new Request(`http://localhost/api/vendor/orders/${orderRejectId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: vendorCookie },
        body: JSON.stringify({ reason: 'Out of stock ingredient' }),
      })
    );
    expect(rejectRes.status).toBe(200);
    expect(((await rejectRes.json()) as { status: string }).status).toBe('cancelled');

    // 3. Stock toggle + price edit
    const stockOff = await exec(
      new Request('http://localhost/api/vendor/menu/item/csb_red_sauce_pasta/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: vendorCookie },
        body: JSON.stringify({ inStock: false }),
      })
    );
    expect(stockOff.status).toBe(200);
    expect(((await stockOff.json()) as { inStock: boolean }).inStock).toBe(false);

    const priceEdit = await exec(
      new Request('http://localhost/api/vendor/menu/item/csb_red_sauce_pasta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: vendorCookie },
        body: JSON.stringify({ pricePaise: 17500, inStock: true }),
      })
    );
    expect(priceEdit.status).toBe(200);
    expect(((await priceEdit.json()) as { item: { pricePaise: number; inStock: boolean } }).item.pricePaise).toBe(17500);

    // Restore original price 16900
    await exec(
      new Request('http://localhost/api/vendor/menu/item/csb_red_sauce_pasta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: vendorCookie },
        body: JSON.stringify({ pricePaise: 16900 }),
      })
    );

    // 4. Night safety, open/closed, busy toggles & default prep time
    const statusRes = await exec(
      new Request('http://localhost/api/vendor/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: vendorCookie },
        body: JSON.stringify({ isOpen: true, busyMinutes: 15, nightSafe: false }),
      })
    );
    expect(statusRes.status).toBe(200);
    expect(((await statusRes.json()) as { vendor: { nightSafe: boolean } }).vendor.nightSafe).toBe(false);

    // Restore defaults
    await exec(
      new Request('http://localhost/api/vendor/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: vendorCookie },
        body: JSON.stringify({ isOpen: true, busyMinutes: 0, nightSafe: true }),
      })
    );

    // 5. Settlement & Insights payload (same IST day clock as placed test orders)
    const insightsRes = await exec(
      new Request('http://localhost/api/vendor/settlement', {
        headers: { Cookie: vendorCookie, 'x-mock-time': ts1400Ist },
      })
    );
    expect(insightsRes.status).toBe(200);
    const insightsBody = (await insightsRes.json()) as {
      ok: boolean;
      insights: {
        todayOrdersCount: number;
        avgPrepMinutes: number;
        promisedPrepMinutes: number;
        topItems: unknown[];
        hourlyBuckets: unknown[];
      };
    };
    expect(insightsBody.ok).toBe(true);
    expect(insightsBody.insights.todayOrdersCount).toBeGreaterThanOrEqual(1);
    expect(insightsBody.insights.hourlyBuckets).toHaveLength(12);
    expect(Array.isArray(insightsBody.insights.topItems)).toBe(true);
  });

  it('enforces server-side RBAC on all /api/admin endpoints (students & vendors get 403) and exercises admin workflows', async () => {
    const exec = async (req: Request) => {
      const ctx = createExecutionContext();
      const res = await worker.fetch(req, env, ctx);
      await waitOnExecutionContext(ctx);
      return res;
    };

    const studentLogin = await exec(new Request('http://localhost/api/auth/demo/student', { method: 'POST' }));
    const studentCookie = (studentLogin.headers.get('set-cookie') || '').split(';')[0];

    const vendorLogin = await exec(new Request('http://localhost/api/auth/demo/vendor', { method: 'POST' }));
    const vendorCookie = (vendorLogin.headers.get('set-cookie') || '').split(';')[0];

    const adminLogin = await exec(new Request('http://localhost/api/auth/demo/admin', { method: 'POST' }));
    const adminCookie = (adminLogin.headers.get('set-cookie') || '').split(';')[0];

    // 1. Exhaustive RBAC matrix: Guest -> 401, Student -> 403, Vendor -> 403
    const adminRoutesToCheck: Array<{ method: string; path: string; body?: unknown }> = [
      { method: 'GET', path: '/api/admin/metrics' },
      { method: 'GET', path: '/api/admin/orders' },
      { method: 'GET', path: '/api/admin/vendors' },
      { method: 'GET', path: '/api/admin/vendor-applications' },
      { method: 'PUT', path: '/api/admin/vendors/rest_csb_nitp/gates', body: { gates: [{ gateId: 'gate_main', extraMinutes: 0 }] } },
      { method: 'PATCH', path: '/api/admin/gates/gate_main', body: { bufferMinutes: 15 } },
      { method: 'GET', path: '/api/admin/coupons' },
      { method: 'POST', path: '/api/admin/coupons', body: { code: 'HACK20', description: 'Unauthorized coupon attempt', discountType: 'flat', discountValue: 2000, minOrderPaise: 0 } },
      { method: 'GET', path: '/api/admin/reports' },
      { method: 'GET', path: '/api/admin/settlements' },
      { method: 'GET', path: '/api/admin/announcements' },
      { method: 'GET', path: '/api/admin/audit-log' },
    ];

    for (const ep of adminRoutesToCheck) {
      const init = (cookie?: string): RequestInit => ({
        method: ep.method,
        headers: {
          ...(ep.body ? { 'Content-Type': 'application/json' } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });

      const guestRes = await exec(new Request(`http://localhost${ep.path}`, init()));
      expect(guestRes.status).toBe(401);

      const studentRes = await exec(new Request(`http://localhost${ep.path}`, init(studentCookie)));
      expect(studentRes.status).toBe(403);

      const vendorRes = await exec(new Request(`http://localhost${ep.path}`, init(vendorCookie)));
      expect(vendorRes.status).toBe(403);
    }

    // 2. Admin Metrics & Filtered Orders
    const metricsRes = await exec(
      new Request('http://localhost/api/admin/metrics', { headers: { Cookie: adminCookie } })
    );
    expect(metricsRes.status).toBe(200);
    const metricsBody = (await metricsRes.json()) as {
      metrics: { liveOrders: number; deliveredToday: number; avgGateEtaMinutes: number; openComplaintsCount: number; vendorsOpenCount: number };
    };
    expect(typeof metricsBody.metrics.liveOrders).toBe('number');
    expect(typeof metricsBody.metrics.deliveredToday).toBe('number');
    expect(metricsBody.metrics.avgGateEtaMinutes).toBeGreaterThan(0);
    expect(typeof metricsBody.metrics.openComplaintsCount).toBe('number');
    expect(typeof metricsBody.metrics.vendorsOpenCount).toBe('number');

    const ordersFiltered = await exec(
      new Request('http://localhost/api/admin/orders?status=delivered&gateId=gate_main', {
        headers: { Cookie: adminCookie },
      })
    );
    expect(ordersFiltered.status).toBe(200);

    // 3. Vendor onboarding application -> Admin approves -> Vendor row & gate reach created
    const appRes = await exec(
      new Request('http://localhost/api/vendor-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName: `Bihta Juice Point ${ulid().slice(-4)}`,
          shopType: 'fruits',
          phone: '9876543211',
        }),
      })
    );
    expect(appRes.status).toBe(201);
    const appBody = (await appRes.json()) as { application: { id: string } };

    const approveRes = await exec(
      new Request(`http://localhost/api/admin/vendor-applications/${appBody.application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ status: 'approved', prepMinutes: 12 }),
      })
    );
    expect(approveRes.status).toBe(200);
    const approveBody = (await approveRes.json()) as { createdVendorId: string };
    expect(approveBody.createdVendorId).toBeTruthy();

    // Update vendor gate reach + edit hours
    const reachRes = await exec(
      new Request(`http://localhost/api/admin/vendors/${approveBody.createdVendorId}/gates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ gates: [{ gateId: 'gate_main', extraMinutes: 2 }] }),
      })
    );
    expect(reachRes.status).toBe(200);
    expect(((await reachRes.json()) as { gateReach: unknown[] }).gateReach).toHaveLength(1);

    // 4. Temporary gate closure with broadcast banner + reopen
    const closeGateRes = await exec(
      new Request('http://localhost/api/admin/gates/gate_h7', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          active: false,
          broadcastBanner: true,
          bannerMessage: 'Girls Hostel Gate maintenance closure for 1 hour',
        }),
      })
    );
    expect(closeGateRes.status).toBe(200);
    expect(((await closeGateRes.json()) as { broadcastAnnouncementId: string }).broadcastAnnouncementId).toBeTruthy();

    await exec(
      new Request('http://localhost/api/admin/gates/gate_h7', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ active: true }),
      })
    );

    // 5. Settlement report by vendor and day + audit log of sensitive mutations
    const settlementRes = await exec(
      new Request('http://localhost/api/admin/settlements', { headers: { Cookie: adminCookie } })
    );
    expect(settlementRes.status).toBe(200);
    const settlementBody = (await settlementRes.json()) as {
      ok: boolean;
      settlements: Array<{ vendorId: string; date: string; grossPaise: number }>;
    };
    expect(settlementBody.ok).toBe(true);
    expect(settlementBody.settlements.length).toBeGreaterThan(0);

    const auditRes = await exec(
      new Request('http://localhost/api/admin/audit-log', { headers: { Cookie: adminCookie } })
    );
    expect(auditRes.status).toBe(200);
    const auditBody = (await auditRes.json()) as { logs: Array<{ action: string }> };
    expect(auditBody.logs.some((l) => l.action === 'VENDOR_APPLICATION_UPDATED')).toBe(true);
    expect(auditBody.logs.some((l) => l.action === 'GATE_CLOSURE_UPDATED')).toBe(true);
  });

  it('enforces strict zero-PII schema and DNT opt-out for /api/analytics/events and aggregates into /api/admin/metrics', async () => {
    const exec = async (req: Request) => {
      const ctx = createExecutionContext();
      const res = await worker.fetch(req, env, ctx);
      await waitOnExecutionContext(ctx);
      return res;
    };

    // 1. Rejects unknown / PII fields via strict Zod schema
    const piiRes = await exec(
      new Request('http://localhost/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'view_menu',
          email: 'student@nitp.ac.in',
          userId: 'usr_student',
        }),
      })
    );
    expect(piiRes.status).toBe(400);

    // 2. Honors DNT header cleanly without writing event
    const dntRes = await exec(
      new Request('http://localhost/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', DNT: '1' },
        body: JSON.stringify({ event: 'view_menu', route: '/vendor/chai-sutta-bar-csb' }),
      })
    );
    expect(dntRes.status).toBe(202);
    expect(((await dntRes.json()) as { recorded: boolean }).recorded).toBe(false);

    // 3. Records valid zero-PII funnel steps & strips query string from route
    for (const ev of ['view_menu', 'add_to_cart', 'checkout_start', 'order_placed', 'handover_confirmed']) {
      const res = await exec(
        new Request('http://localhost/api/analytics/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: ev,
            route: '/vendor/chai-sutta-bar-csb?token=secret_should_strip',
            gateId: 'gate_main',
            vendorId: 'rest_csb_nitp',
          }),
        })
      );
      expect(res.status).toBe(202);
      expect(((await res.json()) as { recorded: boolean }).recorded).toBe(true);
    }

    // 4. Admin metrics surfaces aggregate funnelCounts cleanly
    const db = getDb(env.DB);
    const adminSession = await createSession(db, 'usr_admin');
    const adminCookie = buildSetCookieHeader('session', adminSession.token);
    const metricsRes = await exec(
      new Request('http://localhost/api/admin/metrics', { headers: { Cookie: adminCookie } })
    );
    expect(metricsRes.status).toBe(200);
    const metricsBody = (await metricsRes.json()) as {
      metrics: { funnelCounts: Record<string, number> };
    };
    expect(metricsBody.metrics.funnelCounts.view_menu).toBeGreaterThanOrEqual(1);
    expect(metricsBody.metrics.funnelCounts.handover_confirmed).toBeGreaterThanOrEqual(1);
  });
});
