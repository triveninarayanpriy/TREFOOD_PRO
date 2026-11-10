import { Hono } from 'hono';
import { eq, and, asc, or, like, desc } from 'drizzle-orm';
import type { Env } from '../types';
import {
  campuses,
  gates,
  vendors,
  vendorGates,
  menuCategories,
  menuItems,
  announcements,
  coupons,
  reviews,
} from '../db/schema';
import { canDeliver } from '../services/delivery';
import { priceCart, CartConflictError } from '../services/cart';
import { getRequestNow } from '../utils/time';
import { CartQuoteRequestSchema } from '@shared/schemas';

export const publicRoutes = new Hono<{ Bindings: Env }>();

// GET /api/campuses/:slug
publicRoutes.get('/campuses/:slug', async (c) => {
  const db = c.get('db');
  const slug = c.req.param('slug');
  const now = getRequestNow(c);

  const campus = await db.select().from(campuses).where(eq(campuses.slug, slug)).get();
  if (!campus) {
    return c.json({ error: { code: 'CAMPUS_NOT_FOUND', message: 'Campus not found' } }, 404);
  }

  const [campusGates, campusVendors, campusAnnouncements] = await Promise.all([
    db.select().from(gates).where(eq(gates.campusId, campus.id)).all(),
    db.select().from(vendors).where(and(eq(vendors.campusId, campus.id), eq(vendors.status, 'active'))).all(),
    db.select().from(announcements).where(and(eq(announcements.campusId, campus.id), eq(announcements.active, true))).all(),
  ]);

  const openVendorsCount = campusVendors.filter((v) => v.isOpen).length;

  return c.json({
    ok: true,
    campus,
    gates: campusGates.filter((g) => g.active),
    announcements: campusAnnouncements,
    stats: {
      totalVendors: campusVendors.length,
      openVendorsCount,
      avgEtaMinutes: 20,
      serverTime: now,
    },
  });
});

// GET /api/gates
publicRoutes.get('/gates', async (c) => {
  const db = c.get('db');
  const gateList = await db
    .select()
    .from(gates)
    .where(eq(gates.active, true))
    .all();

  return c.json({ ok: true, gates: gateList });
});

// GET /api/vendors?gate&category&q&veg&open
publicRoutes.get('/vendors', async (c) => {
  const db = c.get('db');
  const gateId = c.req.query('gate') || c.req.query('gateId');
  const category = c.req.query('category');
  const q = c.req.query('q')?.toLowerCase();
  const vegOnly = c.req.query('veg') === 'true' || c.req.query('veg') === '1';
  const openOnly = c.req.query('open') === 'true' || c.req.query('open') === '1';

  const now = getRequestNow(c);

  // Fetch all active gates for curfew check & alternative gate resolution
  const allGates = await db.select().from(gates).all();
  const targetGate = gateId ? allGates.find((g) => g.id === gateId) : null;

  // Fetch active vendors
  const vendorList = await db
    .select()
    .from(vendors)
    .where(eq(vendors.status, 'active'))
    .all();

  // Fetch vendor-gate mappings if gate is specified
  const vendorGateMappings = gateId
    ? await db
        .select()
        .from(vendorGates)
        .where(eq(vendorGates.gateId, gateId))
        .all()
    : [];

  const vendorGateMap = new Map(vendorGateMappings.map((vg) => [vg.vendorId, vg]));

  const results = [];

  for (const v of vendorList) {
    // Veg only filter: exclude meat/raw chicken vendors
    if (vegOnly && v.category === 'raw_chicken') {
      continue;
    }
    // Category filter
    if (category && category !== 'all' && v.category !== category) {
      continue;
    }

    // Text search filter
    if (q) {
      const matchName = v.name.toLowerCase().includes(q);
      const matchDesc = v.description.toLowerCase().includes(q);
      const matchCat = v.category.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchCat) {
        continue;
      }
    }

    // Open filter
    if (openOnly && !v.isOpen) {
      continue;
    }

    const baseSummary = {
      id: v.id,
      slug: v.slug,
      name: v.name,
      nameHi: v.nameHi,
      category: v.category,
      description: v.description,
      fssaiNo: v.fssaiNo,
      hoursJson: v.hoursJson,
      prepMinutes: v.prepMinutes,
      prepMaxMinutes: v.prepMaxMinutes,
      minOrderPaise: v.minOrderPaise,
      isOpen: v.isOpen,
      busyUntil: v.busyUntil,
      nightSafe: v.nightSafe,
      status: v.status,
      ratingAvg: v.ratingAvg,
      ratingCount: v.ratingCount,
    };

    // Gate filtering & delivery check
    if (targetGate) {
      const vg = vendorGateMap.get(v.id);
      if (!vg) {
        continue;
      }

      const deliveryCheck = canDeliver(targetGate, v, now, vg, allGates);

      results.push({
        ...baseSummary,
        canDeliverToGate: deliveryCheck.ok,
        deliveryReason: deliveryCheck.reason,
        deliveryMessage: deliveryCheck.message,
        suggestedGate: deliveryCheck.suggestedGate,
        latestOrderTime: deliveryCheck.latestOrderTime,
        etaMinutes: deliveryCheck.etaMinutes,
      });
    } else {
      results.push(baseSummary);
    }
  }

  return c.json({ ok: true, vendors: results });
});

// GET /api/vendors/:id (Vendor profile by slug OR id + full categorized menu + reviews)
publicRoutes.get('/vendors/:id', async (c) => {
  const db = c.get('db');
  const idOrSlug = c.req.param('id');

  const vendor = await db
    .select()
    .from(vendors)
    .where(or(eq(vendors.slug, idOrSlug), eq(vendors.id, idOrSlug)))
    .get();

  if (!vendor) {
    return c.json({ error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor not found.' } }, 404);
  }

  const [categories, items, recentReviews] = await Promise.all([
    db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.vendorId, vendor.id))
      .orderBy(asc(menuCategories.sort))
      .all(),
    db
      .select()
      .from(menuItems)
      .where(eq(menuItems.vendorId, vendor.id))
      .orderBy(asc(menuItems.sort))
      .all(),
    db
      .select()
      .from(reviews)
      .where(eq(reviews.vendorId, vendor.id))
      .orderBy(desc(reviews.createdAt))
      .limit(10)
      .all(),
  ]);

  const itemsByCategory = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByCategory.get(item.categoryId) || [];
    list.push(item);
    itemsByCategory.set(item.categoryId, list);
  }

  const structuredCategories = categories.map((cat) => ({
    ...cat,
    items: (itemsByCategory.get(cat.id) || []).map((i) => ({
      ...i,
      tags: JSON.parse(i.tags || '[]'),
      variants: JSON.parse(i.variantsJson || '[]'),
      addons: JSON.parse(i.addonsJson || '[]'),
    })),
  }));

  return c.json({
    ok: true,
    vendor: {
      id: vendor.id,
      slug: vendor.slug,
      name: vendor.name,
      nameHi: vendor.nameHi,
      category: vendor.category,
      description: vendor.description,
      fssaiNo: vendor.fssaiNo,
      phone: vendor.phone,
      hoursJson: vendor.hoursJson,
      prepMinutes: vendor.prepMinutes,
      prepMaxMinutes: vendor.prepMaxMinutes,
      minOrderPaise: vendor.minOrderPaise,
      isOpen: vendor.isOpen,
      busyUntil: vendor.busyUntil,
      nightSafe: vendor.nightSafe,
      status: vendor.status,
      ratingAvg: vendor.ratingAvg,
      ratingCount: vendor.ratingCount,
      categories: structuredCategories,
      reviews: recentReviews,
    },
    categories: structuredCategories,
  });
});

// GET /api/search/suggest?q=
publicRoutes.get('/search/suggest', async (c) => {
  const db = c.get('db');
  const q = (c.req.query('q') || '').trim();
  if (q.length < 2) {
    return c.json({ ok: true, vendors: [], items: [] });
  }

  const pattern = `%${q}%`;
  const [matchingVendors, matchingItems] = await Promise.all([
    db
      .select({
        id: vendors.id,
        slug: vendors.slug,
        name: vendors.name,
        category: vendors.category,
        isOpen: vendors.isOpen,
      })
      .from(vendors)
      .where(and(eq(vendors.status, 'active'), like(vendors.name, pattern)))
      .limit(6)
      .all(),
    db
      .select({
        id: menuItems.id,
        vendorId: menuItems.vendorId,
        name: menuItems.name,
        pricePaise: menuItems.pricePaise,
        isVeg: menuItems.isVeg,
        inStock: menuItems.inStock,
      })
      .from(menuItems)
      .where(like(menuItems.name, pattern))
      .limit(6)
      .all(),
  ]);

  return c.json({ ok: true, vendors: matchingVendors, items: matchingItems });
});

// GET /api/coupons
publicRoutes.get('/coupons', async (c) => {
  const db = c.get('db');
  const now = getRequestNow(c);
  const allCoupons = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.campusId, 'campus_nitp'), eq(coupons.active, true)))
    .all();

  const valid = allCoupons.filter((cp) => !cp.expiresAt || cp.expiresAt >= now);
  return c.json({ ok: true, coupons: valid });
});

// POST /api/cart/quote
publicRoutes.post('/cart/quote', async (c) => {
  const db = c.get('db');
  const body = await c.req.json().catch(() => ({}));
  const parseResult = CartQuoteRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: parseResult.error.errors[0]?.message || 'Invalid input' } },
      400
    );
  }

  const { vendorId, gateId, items, couponCode } = parseResult.data;
  const now = getRequestNow(c);
  const currentUser = c.get('user');

  // Verify gate
  const allGates = await db.select().from(gates).all();
  const gate = allGates.find((g) => g.id === gateId);
  if (!gate) {
    return c.json({ error: { code: 'GATE_NOT_FOUND', message: 'Gate not found' } }, 404);
  }

  // Verify vendor
  const vendor = await db.select().from(vendors).where(eq(vendors.id, vendorId)).get();
  if (!vendor) {
    return c.json({ error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' } }, 404);
  }

  // Verify reachability
  const vg = await db
    .select()
    .from(vendorGates)
    .where(and(eq(vendorGates.vendorId, vendorId), eq(vendorGates.gateId, gateId)))
    .get();

  // Curfew & delivery check
  const deliveryCheck = canDeliver(gate, vendor, now, vg, allGates);

  // Price cart from server truth
  try {
    const pricedCart = await priceCart(db, vendorId, items, {
      couponCode,
      userId: currentUser?.id,
      nowUtcSeconds: now,
    });

    return c.json({
      ok: true,
      vendorId,
      gateId,
      items: pricedCart.items,
      subtotalPaise: pricedCart.subtotalPaise,
      packingTotalPaise: pricedCart.packingTotalPaise,
      discountPaise: pricedCart.discountPaise,
      deliveryFeePaise: 0,
      totalPaise: pricedCart.totalPaise,
      totalQuantity: pricedCart.totalQuantity,
      meetsMinOrder: pricedCart.meetsMinOrder,
      shortfallPaise: pricedCart.shortfallPaise,
      couponApplied: pricedCart.couponApplied,
      couponError: pricedCart.couponError,
      canDeliver: deliveryCheck.ok,
      deliveryReason: deliveryCheck.reason,
      deliveryMessage: deliveryCheck.message,
      etaMinutes: deliveryCheck.etaMinutes || 25,
      etaAt: deliveryCheck.etaAt || now + 25 * 60,
      estimatedArrivalIst: deliveryCheck.estimatedArrivalIst || '',
      latestOrderTime: deliveryCheck.latestOrderTime,
      suggestedGate: deliveryCheck.suggestedGate,
      alternativeGates: deliveryCheck.alternativeGates,
    });
  } catch (err) {
    if (err instanceof CartConflictError) {
      return c.json(
        {
          error: {
            code: err.code,
            message: err.message,
            details: err.details,
          },
        },
        409
      );
    }
    throw err;
  }
});

// GET /api/announcements
publicRoutes.get('/announcements', async (c) => {
  const db = c.get('db');
  const list = await db
    .select()
    .from(announcements)
    .where(eq(announcements.active, true))
    .all();

  return c.json({ ok: true, announcements: list });
});
