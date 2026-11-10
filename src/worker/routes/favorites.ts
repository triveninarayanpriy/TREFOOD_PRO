import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import type { Env } from '../types';
import { favorites, vendors } from '../db/schema';
import { requireAuth } from '../middleware';
import { ulid } from '../utils/ulid';
import { nowUtc } from '../utils/time';

export const favoritesRoutes = new Hono<{ Bindings: Env }>();

favoritesRoutes.use('*', requireAuth);

// GET /api/favorites (Indexed by idx_favorites_user)
favoritesRoutes.get('/', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;

  const rows = await db
    .select({
      favoriteId: favorites.id,
      createdAt: favorites.createdAt,
      vendor: vendors,
    })
    .from(favorites)
    .innerJoin(vendors, eq(favorites.vendorId, vendors.id))
    .where(eq(favorites.userId, user.id))
    .all();

  return c.json({
    ok: true,
    vendorIds: rows.map((r) => r.vendor.id),
    favorites: rows.map((r) => ({
      id: r.favoriteId,
      createdAt: r.createdAt,
      vendor: {
        id: r.vendor.id,
        slug: r.vendor.slug,
        name: r.vendor.name,
        nameHi: r.vendor.nameHi,
        category: r.vendor.category,
        description: r.vendor.description,
        fssaiNo: r.vendor.fssaiNo,
        prepMinutes: r.vendor.prepMinutes,
        isOpen: r.vendor.isOpen,
        busyUntil: r.vendor.busyUntil,
        nightSafe: r.vendor.nightSafe,
        status: r.vendor.status,
        ratingAvg: r.vendor.ratingAvg,
        ratingCount: r.vendor.ratingCount,
      },
    })),
  });
});

// POST /api/favorites/:vendorId
favoritesRoutes.post('/:vendorId', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const vendorId = c.req.param('vendorId');

  const vendor = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.id, vendorId)).get();
  if (!vendor) {
    return c.json({ error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' } }, 404);
  }

  const existing = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.vendorId, vendorId)))
    .get();

  if (!existing) {
    await db.insert(favorites).values({
      id: ulid(),
      userId: user.id,
      vendorId,
      createdAt: nowUtc(),
    });
  }

  return c.json({ ok: true, vendorId, isFavorite: true }, 201);
});

// DELETE /api/favorites/:vendorId
favoritesRoutes.delete('/:vendorId', async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const vendorId = c.req.param('vendorId');

  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.vendorId, vendorId)));

  return c.json({ ok: true, vendorId, isFavorite: false });
});
