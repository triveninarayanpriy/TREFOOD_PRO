import { Hono } from 'hono';
import { eq, and, lte } from 'drizzle-orm';
import type { Env } from './types';
import { getDb } from './db';
import { orders, orderEvents, vendors } from './db/schema';
import {
  requestIdMiddleware,
  securityHeadersMiddleware,
  sameOriginMiddleware,
  sessionAuthMiddleware,
} from './middleware';
import { authRoutes } from './routes/auth';
import { publicRoutes } from './routes/public';
import { orderRoutes } from './routes/orders';
import { vendorRoutes } from './routes/vendor';
import { adminRoutes } from './routes/admin';
import { nowUtc } from './utils/time';
import { ulid } from './utils/ulid';
import type { HealthResponse } from '@shared/types';

const app = new Hono<{ Bindings: Env }>();

// 1. Core global middleware
app.use('*', requestIdMiddleware);
app.use('*', securityHeadersMiddleware);
app.use('*', sameOriginMiddleware);

// 2. Initialize D1 database and attach to context
app.use('*', async (c, next) => {
  if (c.env.DB) {
    c.set('db', getDb(c.env.DB));
  }
  await next();
});

// 3. Authenticate session cookie if present
app.use('*', sessionAuthMiddleware);

// 4. API Health check
app.get('/api/health', async (c) => {
  let dbHealthy = false;
  try {
    if (c.env.DB) {
      const result = await c.env.DB.prepare('SELECT 1 as alive').first<{ alive: number }>();
      dbHealthy = result?.alive === 1;
    }
  } catch (err) {
    console.error('Health check DB error:', err);
    dbHealthy = false;
  }

  const response: HealthResponse = {
    ok: dbHealthy,
    version: c.env.APP_VERSION || '0.1.0',
    commit: c.env.GIT_COMMIT || '0ba74a9',
    db: dbHealthy,
  };

  return c.json(response, dbHealthy ? 200 : 503);
});

// 5. Mount API route groups
app.route('/api/auth', authRoutes);
app.route('/api/orders', orderRoutes);
app.route('/api/vendor', vendorRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api', publicRoutes); // /api/gates, /api/vendors, /api/cart/quote, /api/announcements

// 6. SEO & Bot routes
app.get('/sitemap.xml', async (c) => {
  const db = c.get('db');
  let vendorList: Array<{ slug: string }> = [];
  try {
    if (db) {
      vendorList = await db.select({ slug: vendors.slug }).from(vendors).where(eq(vendors.status, 'active')).all();
    }
  } catch {}

  const host = c.req.header('host') || 'trefood-prototype.technicaltriveniyt.workers.dev';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  const urls = [
    `${baseUrl}/`,
    `${baseUrl}/browse`,
    ...vendorList.map((v) => `${baseUrl}/vendor/${v.slug}`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><changefreq>hourly</changefreq></url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});

app.get('/robots.txt', async (c) => {
  const host = c.req.header('host') || 'trefood-prototype.technicaltriveniyt.workers.dev';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const txt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /v

Sitemap: ${proto}://${host}/sitemap.xml
`;
  return new Response(txt, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
});

// 7. Typed JSON Error Handler
app.onError((err, c) => {
  console.error(`[Error] ${c.req.method} ${c.req.url}:`, err);
  return c.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred.',
      },
    },
    500
  );
});

// 7. Fallback to static assets for non-API routes
app.all('*', async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.notFound();
});

export async function expireOldPlacedOrders(env: Env): Promise<number> {
  if (!env.DB) return 0;
  const db = getDb(env.DB);
  const fiveMinutesAgo = nowUtc() - 300; // 5 minutes in seconds

  const placedToCancel = await db
    .select()
    .from(orders)
    .where(and(eq(orders.status, 'placed'), lte(orders.placedAt, fiveMinutesAgo)))
    .all();

  for (const order of placedToCancel) {
    const now = nowUtc();
    await db
      .update(orders)
      .set({
        status: 'expired',
        expiredAt: now,
        cancelReason: 'Order auto-expired after 5 minutes without vendor acceptance',
      })
      .where(eq(orders.id, order.id));

    await db.insert(orderEvents).values({
      id: ulid(),
      orderId: order.id,
      status: 'expired',
      actorId: null,
      at: now,
      note: 'Order auto-expired after 5 minutes without vendor acceptance',
    });
  }

  return placedToCancel.length;
}

// Module Worker default export
export default {
  fetch: app.fetch,
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    const count = await expireOldPlacedOrders(env);
    if (count > 0) {
      console.log(`[Cron] Expired ${count} stale placed order(s).`);
    }
  },
};
