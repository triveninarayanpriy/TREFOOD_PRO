import { Hono } from 'hono';
import { eq, and, asc, or, like, desc, inArray, sql } from 'drizzle-orm';
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
  orders,
  users,
  vendorApplications,
  funnelEvents,
} from '../db/schema';
import { canDeliver } from '../services/delivery';
import { getAvailableScheduleSlots } from '@shared/curfew';
import { priceCart, CartConflictError } from '../services/cart';
import { getRequestNow, nowUtc } from '../utils/time';
import { ulid } from '../utils/ulid';
import { checkRateLimit } from '../utils/rate-limit';
import {
  CartQuoteRequestSchema,
  VendorApplicationInputSchema,
  AnalyticsEventInputSchema,
} from '@shared/schemas';

export const publicRoutes = new Hono<{ Bindings: Env }>();

// GET /api/campuses/:slug
publicRoutes.get('/campuses/:slug', async (c) => {
  const db = c.get('db');
  const slug = c.req.param('slug');
  const now = getRequestNow(c);

  const campusSlugToFind = slug === 'nit-patna' ? 'nitp' : slug;
  const campus = await db
    .select()
    .from(campuses)
    .where(or(eq(campuses.slug, slug), eq(campuses.slug, campusSlugToFind)))
    .get();
  if (!campus) {
    return c.json({ error: { code: 'CAMPUS_NOT_FOUND', message: 'Campus not found' } }, 404);
  }

  const [campusGates, campusVendors, campusAnnouncements] = await Promise.all([
    db.select().from(gates).where(eq(gates.campusId, campus.id)).all(),
    db.select().from(vendors).where(and(eq(vendors.campusId, campus.id), eq(vendors.status, 'active'))).all(),
    db.select().from(announcements).where(and(eq(announcements.campusId, campus.id), eq(announcements.active, true))).all(),
  ]);

  const activeGates = campusGates.filter((g) => g.active);
  const openVendors = campusVendors.filter((v) => v.isOpen);
  const openVendorsCount = openVendors.length;

  // Compute indexed delivered order count via idx_orders_gate_status
  let ordersHandedOver = 0;
  if (activeGates.length > 0) {
    const activeGateIds = activeGates.map((g) => g.id);
    const deliveredAgg = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(inArray(orders.gateId, activeGateIds), eq(orders.status, 'delivered')))
      .get();
    ordersHandedOver = Number(deliveredAgg?.count || 0);
  }

  // Average ETA across open vendors + average active gate travel time
  const avgPrep =
    openVendors.length > 0
      ? openVendors.reduce((sum, v) => sum + v.prepMinutes, 0) / openVendors.length
      : 15;
  const avgTravel =
    activeGates.length > 0
      ? activeGates.reduce((sum, g) => sum + g.travelMinutes, 0) / activeGates.length
      : 8;
  const avgEtaMinutes = Math.max(10, Math.round(avgPrep + avgTravel));

  return c.json({
    ok: true,
    campus,
    gates: activeGates,
    announcements: campusAnnouncements,
    stats: {
      totalVendors: campusVendors.length,
      openVendorsCount,
      avgEtaMinutes,
      ordersHandedOver,
      serverTime: now,
      isSampleData: true,
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

function parseJsonArray(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

function matchesRealCategory(
  vendor: { category: string; cuisinesJson?: string | null; dineInAvailable?: boolean | null },
  category: string | undefined,
  hasChickenItems: boolean
): boolean {
  if (!category || category === 'all' || category === 'food') return true;
  if (vendor.category === category) return true;
  const cuisines = parseJsonArray(vendor.cuisinesJson).map((c) => c.toLowerCase());
  if (category === 'fruits' || category === 'fruits_juices' || category === 'beverages' || category === 'juices') {
    return cuisines.some((c) => c.includes('beverage') || c.includes('shake') || c.includes('juice') || c.includes('chai'));
  }
  if (category === 'groceries') {
    return cuisines.some((c) => c.includes('snack') || c.includes('cafe') || c.includes('waffle'));
  }
  if (category === 'raw_chicken' || category === 'fresh_chicken' || category === 'chicken') {
    return hasChickenItems;
  }
  if (category === 'dine_in') {
    return Boolean(vendor.dineInAvailable);
  }
  return false;
}

function deriveVendorOfferTags(vendor: { category: string; minOrderPaise: number; nightSafe: boolean; badgesJson?: string | null }): string[] {
  const badges = parseJsonArray(vendor.badgesJson);
  if (badges.length > 0) return badges.slice(0, 3);
  const tags: string[] = ['ZERO Delivery Fee', 'Student Offers'];
  if (vendor.nightSafe) tags.push('Night Safe');
  return tags;
}

// GET /api/vendors?gate&category&q&veg&open
publicRoutes.get('/vendors', async (c) => {
  const db = c.get('db');
  const gateId = c.req.query('gate') || c.req.query('gateId');
  const category = c.req.query('category');
  const q = c.req.query('q')?.toLowerCase();
  const vegOnly = c.req.query('veg') === 'true' || c.req.query('veg') === '1';
  const openOnly = c.req.query('open') === 'true' || c.req.query('open') === '1';

  const now = getRequestNow(c);

  const [allGates, vendorList, vendorGateMappings] = await Promise.all([
    db.select().from(gates).all(),
    db.select().from(vendors).where(eq(vendors.status, 'active')).all(),
    gateId ? db.select().from(vendorGates).where(eq(vendorGates.gateId, gateId)).all() : Promise.resolve([]),
  ]);

  const targetGate = gateId ? allGates.find((g) => g.id === gateId) : null;
  const vendorGateMap = new Map(vendorGateMappings.map((vg) => [vg.vendorId, vg]));

  // Batch fetch menu items once for all active vendors using idx_menu_items_vendor (no N+1)
  const vendorIds = vendorList.map((v) => v.id);
  const allMenuItems =
    vendorIds.length > 0
      ? await db
          .select({
            id: menuItems.id,
            vendorId: menuItems.vendorId,
            name: menuItems.name,
            description: menuItems.description,
            pricePaise: menuItems.pricePaise,
            imageUrl: menuItems.imageUrl,
            isVeg: menuItems.isVeg,
            tags: menuItems.tags,
            variantsJson: menuItems.variantsJson,
            addonsJson: menuItems.addonsJson,
            inStock: menuItems.inStock,
          })
          .from(menuItems)
          .where(inArray(menuItems.vendorId, vendorIds))
          .all()
      : [];

  const itemStatsByVendor = new Map<
    string,
    {
      startingPricePaise: number;
      minVegPricePaise: number | undefined;
      hasVegItems: boolean;
      hasNonVegItems: boolean;
      items: typeof allMenuItems;
    }
  >();

  for (const item of allMenuItems) {
    const entry = itemStatsByVendor.get(item.vendorId) || {
      startingPricePaise: 0,
      minVegPricePaise: undefined,
      hasVegItems: false,
      hasNonVegItems: false,
      items: [],
    };
    entry.items.push(item);
    if (item.isVeg) entry.hasVegItems = true;
    else entry.hasNonVegItems = true;

    if (item.inStock || entry.startingPricePaise === 0) {
      if (entry.startingPricePaise === 0 || (item.inStock && item.pricePaise < entry.startingPricePaise)) {
        entry.startingPricePaise = item.pricePaise;
      }
      if (item.isVeg && item.inStock) {
        if (entry.minVegPricePaise === undefined || item.pricePaise < entry.minVegPricePaise) {
          entry.minVegPricePaise = item.pricePaise;
        }
      }
    }
    itemStatsByVendor.set(item.vendorId, entry);
  }

  const results = [];
  const quickPicks: Array<{
    id: string;
    vendorId: string;
    vendorSlug: string;
    vendorName: string;
    vendorCategory: string;
    vendorIsOpen: boolean;
    etaMinutes: number;
    name: string;
    description: string;
    pricePaise: number;
    isVeg: boolean;
    imageUrl?: string | null;
    tags: string[];
    hasCustomisation: boolean;
  }> = [];

  for (const v of vendorList) {
    const itemStats = itemStatsByVendor.get(v.id);
    const hasVegItems = itemStats ? itemStats.hasVegItems : v.category !== 'raw_chicken';
    const hasChickenItems = Boolean(
      itemStats?.items.some((i) => i.name.toLowerCase().includes('chicken'))
    );

    if (vegOnly && (v.category === 'raw_chicken' || !hasVegItems)) {
      continue;
    }
    if (!matchesRealCategory(v, category, hasChickenItems)) {
      continue;
    }

    const cuisines = parseJsonArray(v.cuisinesJson);
    if (q) {
      const matchName = v.name.toLowerCase().includes(q);
      const matchDesc = v.description.toLowerCase().includes(q);
      const matchCat = v.category.toLowerCase().includes(q);
      const matchCuisine = cuisines.some((cui) => cui.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchCat && !matchCuisine) {
        continue;
      }
    }

    if (openOnly && !v.isOpen) {
      continue;
    }

    const baseSummary = {
      id: v.id,
      slug: v.slug,
      name: v.name,
      nameHi: v.nameHi,
      tagline: v.tagline,
      category: v.category,
      cuisines,
      badges: parseJsonArray(v.badgesJson),
      coverImageUrl: v.coverImageUrl,
      description: v.description,
      nightSafetyNotice: v.nightSafetyNotice,
      fssaiNo: v.fssaiNo,
      hoursJson: v.hoursJson,
      prepMinutes: v.prepMinutes,
      prepMaxMinutes: v.prepMaxMinutes,
      minOrderPaise: v.minOrderPaise,
      startingPricePaise: itemStats?.startingPricePaise || 0,
      minVegPricePaise: itemStats?.minVegPricePaise,
      hasVegItems,
      hasNonVegItems: itemStats?.hasNonVegItems ?? v.category === 'raw_chicken',
      offerTags: deriveVendorOfferTags(v),
      isOpen: v.isOpen,
      busyUntil: v.busyUntil,
      nightSafe: v.nightSafe,
      dineInAvailable: v.dineInAvailable,
      outOfStockCount: v.outOfStockCount,
      status: v.status,
      ratingAvg: v.ratingAvg,
      ratingCount: v.ratingCount,
    };

    let vendorOpenForGate = v.isOpen;
    let resolvedEta = v.prepMinutes + (targetGate?.travelMinutes ?? 10);

    if (targetGate) {
      const vg = vendorGateMap.get(v.id);
      if (!vg) {
        continue;
      }

      const deliveryCheck = canDeliver(targetGate, v, now, vg, allGates);
      vendorOpenForGate = deliveryCheck.ok;
      resolvedEta = deliveryCheck.etaMinutes ?? resolvedEta;

      results.push({
        ...baseSummary,
        canDeliverToGate: deliveryCheck.ok,
        deliveryReason: deliveryCheck.reason,
        deliveryMessage: deliveryCheck.message,
        suggestedGate: deliveryCheck.suggestedGate,
        latestOrderTime: deliveryCheck.latestOrderTime,
        etaMinutes: resolvedEta,
      });
    } else {
      results.push({ ...baseSummary, etaMinutes: resolvedEta });
    }

    // Collect Quick Picks from open, gate-reachable vendors
    if (vendorOpenForGate && itemStats) {
      for (const item of itemStats.items) {
        if (!item.inStock) continue;
        if (vegOnly && !item.isVeg) continue;
        let parsedTags: string[] = [];
        try {
          parsedTags = JSON.parse(item.tags || '[]');
        } catch {}
        if (
          parsedTags.includes('bestseller') ||
          parsedTags.includes('popular') ||
          parsedTags.includes('healthy') ||
          parsedTags.includes('essential')
        ) {
          const hasVariants = item.variantsJson && item.variantsJson !== '[]';
          const hasAddons = item.addonsJson && item.addonsJson !== '[]';
          quickPicks.push({
            id: item.id,
            vendorId: v.id,
            vendorSlug: v.slug,
            vendorName: v.name,
            vendorCategory: v.category,
            vendorIsOpen: true,
            etaMinutes: resolvedEta,
            name: item.name,
            description: item.description,
            pricePaise: item.pricePaise,
            isVeg: item.isVeg,
            imageUrl: item.imageUrl,
            tags: parsedTags,
            hasCustomisation: Boolean(hasVariants || hasAddons),
          });
        }
      }
    }
  }

  // Sort Quick Picks putting bestsellers & fast ETH first, limit to 8
  quickPicks.sort((a, b) => {
    const aBest = a.tags.includes('bestseller') ? 0 : 1;
    const bBest = b.tags.includes('bestseller') ? 0 : 1;
    if (aBest !== bBest) return aBest - bBest;
    return a.etaMinutes - b.etaMinutes;
  });

  return c.json({ ok: true, vendors: results, quickPicks: quickPicks.slice(0, 8) });
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
      .limit(15)
      .all(),
  ]);

  // Batch lookup reviewer first names
  const reviewerIds = Array.from(new Set(recentReviews.map((r) => r.userId)));
  const reviewerRows =
    reviewerIds.length > 0
      ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, reviewerIds)).all()
      : [];
  const reviewerMap = new Map(
    reviewerRows.map((u) => {
      const parts = u.name.trim().split(/\s+/);
      const display = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
      return [u.id, display];
    })
  );

  const itemsByCategory = new Map<string, typeof items>();
  let outOfStockCount = 0;
  for (const item of items) {
    if (!item.inStock) outOfStockCount++;
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

  const enrichedReviews = recentReviews.map((r) => ({
    ...r,
    reviewerName: reviewerMap.get(r.userId) || 'NITP Student',
  }));

  return c.json({
    ok: true,
    vendor: {
      id: vendor.id,
      slug: vendor.slug,
      name: vendor.name,
      nameHi: vendor.nameHi,
      tagline: vendor.tagline,
      category: vendor.category,
      cuisines: parseJsonArray(vendor.cuisinesJson),
      badges: parseJsonArray(vendor.badgesJson),
      coverImageUrl: vendor.coverImageUrl,
      description: vendor.description,
      nightSafetyNotice: vendor.nightSafetyNotice,
      fssaiNo: vendor.fssaiNo,
      phone: vendor.phone,
      hoursJson: vendor.hoursJson,
      prepMinutes: vendor.prepMinutes,
      prepMaxMinutes: vendor.prepMaxMinutes,
      minOrderPaise: vendor.minOrderPaise,
      isOpen: vendor.isOpen,
      busyUntil: vendor.busyUntil,
      nightSafe: vendor.nightSafe,
      dineInAvailable: vendor.dineInAvailable,
      status: vendor.status,
      ratingAvg: vendor.ratingAvg,
      ratingCount: vendor.ratingCount,
      outOfStockCount: outOfStockCount || vendor.outOfStockCount,
      offerTags: deriveVendorOfferTags(vendor),
      categories: structuredCategories,
      reviews: enrichedReviews,
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
  const [matchingVendors, matchingItems, activeVendors] = await Promise.all([
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
    db
      .select({ id: vendors.id, slug: vendors.slug, name: vendors.name })
      .from(vendors)
      .where(eq(vendors.status, 'active'))
      .all(),
  ]);

  const vendorMeta = new Map(activeVendors.map((v) => [v.id, v]));
  const enrichedItems = matchingItems
    .filter((i) => vendorMeta.has(i.vendorId))
    .map((i) => ({
      ...i,
      vendorSlug: vendorMeta.get(i.vendorId)!.slug,
      vendorName: vendorMeta.get(i.vendorId)!.name,
    }));

  return c.json({ ok: true, vendors: matchingVendors, items: enrichedItems });
});

// GET /api/search?q&gate&category&veg&open&sort
publicRoutes.get('/search', async (c) => {
  const db = c.get('db');
  const rawQ = (c.req.query('q') || '').trim();
  const q = rawQ.toLowerCase();
  const gateId = c.req.query('gate') || c.req.query('gateId');
  const category = c.req.query('category');
  const vegOnly = c.req.query('veg') === 'true' || c.req.query('veg') === '1';
  const openOnly = c.req.query('open') === 'true' || c.req.query('open') === '1';
  const sortBy = c.req.query('sort') || 'relevance';
  const now = getRequestNow(c);

  const [allGates, activeVendors, vendorGateMappings] = await Promise.all([
    db.select().from(gates).all(),
    db.select().from(vendors).where(eq(vendors.status, 'active')).all(),
    gateId ? db.select().from(vendorGates).where(eq(vendorGates.gateId, gateId)).all() : Promise.resolve([]),
  ]);

  const targetGate = gateId ? allGates.find((g) => g.id === gateId) : null;
  const vendorGateMap = new Map(vendorGateMappings.map((vg) => [vg.vendorId, vg]));
  const activeVendorIds = activeVendors.map((v) => v.id);

  const allItems =
    activeVendorIds.length > 0
      ? await db
          .select()
          .from(menuItems)
          .where(inArray(menuItems.vendorId, activeVendorIds))
          .all()
      : [];

  const vendorEvalMap = new Map<
    string,
    {
      vendor: (typeof activeVendors)[number];
      canDeliver: boolean;
      etaMinutes: number;
      deliveryReason?: string;
      deliveryMessage?: string;
      startingPricePaise: number;
      minVegPricePaise?: number;
      hasVegItems: boolean;
    }
  >();

  const itemsByVendor = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const arr = itemsByVendor.get(item.vendorId) || [];
    arr.push(item);
    itemsByVendor.set(item.vendorId, arr);
  }

  for (const v of activeVendors) {
    let canDeliverToGate = v.isOpen;
    let etaMinutes = v.prepMinutes + (targetGate?.travelMinutes ?? 10);
    let deliveryReason: string | undefined;
    let deliveryMessage: string | undefined;

    if (targetGate) {
      const vg = vendorGateMap.get(v.id);
      if (!vg) continue; // unreachable for selected gate
      const check = canDeliver(targetGate, v, now, vg, allGates);
      canDeliverToGate = check.ok;
      etaMinutes = check.etaMinutes ?? etaMinutes;
      deliveryReason = check.reason;
      deliveryMessage = check.message;
    }

    const vItems = itemsByVendor.get(v.id) || [];
    let startingPricePaise = 0;
    let minVegPricePaise: number | undefined;
    let hasVegItems = false;

    for (const item of vItems) {
      if (item.isVeg) hasVegItems = true;
      if (item.inStock || startingPricePaise === 0) {
        if (startingPricePaise === 0 || (item.inStock && item.pricePaise < startingPricePaise)) {
          startingPricePaise = item.pricePaise;
        }
        if (item.isVeg && item.inStock) {
          if (minVegPricePaise === undefined || item.pricePaise < minVegPricePaise) {
            minVegPricePaise = item.pricePaise;
          }
        }
      }
    }

    vendorEvalMap.set(v.id, {
      vendor: v,
      canDeliver: canDeliverToGate,
      etaMinutes,
      deliveryReason,
      deliveryMessage,
      startingPricePaise,
      minVegPricePaise,
      hasVegItems: v.category !== 'raw_chicken' && (hasVegItems || vItems.length === 0),
    });
  }

  const matchedVendors: Array<Record<string, unknown>> = [];
  const matchedDishes: Array<Record<string, unknown>> = [];

  for (const [, info] of vendorEvalMap) {
    const v = info.vendor;
    const vItemsList = itemsByVendor.get(v.id) || [];
    const hasChicken = vItemsList.some((it) => it.name.toLowerCase().includes('chicken'));
    if (!matchesRealCategory(v, category, hasChicken)) continue;
    if (openOnly && !info.canDeliver) continue;

    const cuisines = parseJsonArray(v.cuisinesJson);
    // Match vendor
    if (!vegOnly || info.hasVegItems) {
      const vendorMatches =
        !q ||
        v.name.toLowerCase().includes(q) ||
        (v.nameHi || '').toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.category.toLowerCase().replace('_', ' ').includes(q) ||
        cuisines.some((cui) => cui.toLowerCase().includes(q)) ||
        vItemsList.some((it) => it.name.toLowerCase().includes(q));

      if (vendorMatches) {
        matchedVendors.push({
          id: v.id,
          slug: v.slug,
          name: v.name,
          nameHi: v.nameHi,
          tagline: v.tagline,
          category: v.category,
          cuisines,
          badges: parseJsonArray(v.badgesJson),
          coverImageUrl: v.coverImageUrl,
          description: v.description,
          nightSafetyNotice: v.nightSafetyNotice,
          fssaiNo: v.fssaiNo,
          hoursJson: v.hoursJson,
          prepMinutes: v.prepMinutes,
          prepMaxMinutes: v.prepMaxMinutes,
          minOrderPaise: v.minOrderPaise,
          startingPricePaise: info.startingPricePaise,
          minVegPricePaise: info.minVegPricePaise,
          hasVegItems: info.hasVegItems,
          offerTags: deriveVendorOfferTags(v),
          isOpen: v.isOpen,
          busyUntil: v.busyUntil,
          nightSafe: v.nightSafe,
          dineInAvailable: v.dineInAvailable,
          outOfStockCount: v.outOfStockCount,
          status: v.status,
          ratingAvg: v.ratingAvg,
          ratingCount: v.ratingCount,
          canDeliverToGate: info.canDeliver,
          deliveryReason: info.deliveryReason,
          deliveryMessage: info.deliveryMessage,
          etaMinutes: info.etaMinutes,
        });
      }
    }

    // Match dishes
    const vItems = itemsByVendor.get(v.id) || [];
    for (const item of vItems) {
      if (vegOnly && !item.isVeg) continue;
      let parsedTags: string[] = [];
      try {
        parsedTags = JSON.parse(item.tags || '[]');
      } catch {}

      const dishMatches =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.nameHi || '').toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        parsedTags.some((t) => t.toLowerCase().includes(q));

      if (!dishMatches) continue;

      const hasVariants = item.variantsJson && item.variantsJson !== '[]';
      const hasAddons = item.addonsJson && item.addonsJson !== '[]';

      matchedDishes.push({
        id: item.id,
        vendorId: v.id,
        vendorSlug: v.slug,
        vendorName: v.name,
        vendorCategory: v.category,
        vendorIsOpen: v.isOpen,
        vendorRatingAvg: v.ratingAvg,
        vendorNightSafe: v.nightSafe,
        canDeliverToGate: info.canDeliver,
        etaMinutes: info.etaMinutes,
        name: item.name,
        nameHi: item.nameHi,
        description: item.description,
        pricePaise: item.pricePaise,
        isVeg: item.isVeg,
        inStock: item.inStock,
        imageUrl: item.imageUrl,
        tags: parsedTags,
        hasCustomisation: Boolean(hasVariants || hasAddons),
      });
    }
  }

  // Sorting
  matchedVendors.sort((a, b) => {
    const aOpen = a.canDeliverToGate !== false && a.isOpen ? 0 : 1;
    const bOpen = b.canDeliverToGate !== false && b.isOpen ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    if (sortBy === 'eta') return Number(a.etaMinutes) - Number(b.etaMinutes);
    if (sortBy === 'rating') return Number(b.ratingAvg) - Number(a.ratingAvg);
    if (sortBy === 'price_asc') return Number(a.startingPricePaise || 0) - Number(b.startingPricePaise || 0);
    if (sortBy === 'price_desc') return Number(b.startingPricePaise || 0) - Number(a.startingPricePaise || 0);
    if (q) {
      const aDirect = String(a.name).toLowerCase().includes(q) ? 0 : 1;
      const bDirect = String(b.name).toLowerCase().includes(q) ? 0 : 1;
      if (aDirect !== bDirect) return aDirect - bDirect;
    }
    return Number(b.ratingAvg) - Number(a.ratingAvg);
  });

  matchedDishes.sort((a, b) => {
    const aAvail = a.canDeliverToGate && a.inStock ? 0 : 1;
    const bAvail = b.canDeliverToGate && b.inStock ? 0 : 1;
    if (aAvail !== bAvail) return aAvail - bAvail;
    if (sortBy === 'eta') return Number(a.etaMinutes) - Number(b.etaMinutes);
    if (sortBy === 'rating') return Number(b.vendorRatingAvg) - Number(a.vendorRatingAvg);
    if (sortBy === 'price_asc') return Number(a.pricePaise) - Number(b.pricePaise);
    if (sortBy === 'price_desc') return Number(b.pricePaise) - Number(a.pricePaise);
    if (q) {
      const aPrefix = String(a.name).toLowerCase().startsWith(q) ? 0 : 1;
      const bPrefix = String(b.name).toLowerCase().startsWith(q) ? 0 : 1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    }
    return Number(b.vendorRatingAvg) - Number(a.vendorRatingAvg);
  });

  return c.json({
    ok: true,
    query: rawQ,
    vendors: matchedVendors,
    dishes: matchedDishes.slice(0, 60),
    counts: {
      all: matchedVendors.length + Math.min(matchedDishes.length, 60),
      vendors: matchedVendors.length,
      dishes: Math.min(matchedDishes.length, 60),
    },
  });
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

  const { vendorId, gateId, items, couponCode, scheduledFor } = parseResult.data;
  const now = getRequestNow(c);
  const currentUser = c.get('user');
  const isScheduled = Boolean(scheduledFor && scheduledFor > now);
  const checkTimestamp = isScheduled ? scheduledFor! : now;

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

  // Curfew & delivery check (supports scheduled slots vs live right-now check)
  const deliveryCheck = canDeliver(gate, vendor, checkTimestamp, vg, allGates, { isScheduled });
  const availableSlots = getAvailableScheduleSlots(vendor, gate, now, vg, 12);

  // Price cart from server truth
  try {
    const pricedCart = await priceCart(db, vendorId, items, {
      couponCode,
      userId: currentUser?.id,
      nowUtcSeconds: now,
    });

    // When short of vendor minimum order, suggest up to 3 in-stock add-ons from the same vendor
    let suggestedAddons: Array<{
      id: string;
      name: string;
      pricePaise: number;
      isVeg: boolean;
    }> = [];
    if (!pricedCart.meetsMinOrder && pricedCart.shortfallPaise > 0) {
      const inCartIds = new Set(items.map((i) => i.itemId));
      const vendorItems = await db
        .select({
          id: menuItems.id,
          name: menuItems.name,
          pricePaise: menuItems.pricePaise,
          isVeg: menuItems.isVeg,
          inStock: menuItems.inStock,
        })
        .from(menuItems)
        .where(and(eq(menuItems.vendorId, vendorId), eq(menuItems.inStock, true)))
        .all();

      suggestedAddons = vendorItems
        .filter((it) => !inCartIds.has(it.id))
        .sort((a, b) => {
          const aMeets = a.pricePaise >= pricedCart.shortfallPaise ? 0 : 1;
          const bMeets = b.pricePaise >= pricedCart.shortfallPaise ? 0 : 1;
          if (aMeets !== bMeets) return aMeets - bMeets;
          return (
            Math.abs(a.pricePaise - pricedCart.shortfallPaise) -
            Math.abs(b.pricePaise - pricedCart.shortfallPaise)
          );
        })
        .slice(0, 3)
        .map(({ id, name, pricePaise, isVeg }) => ({ id, name, pricePaise, isVeg }));
    }

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
      minOrderPaise: vendor.minOrderPaise,
      meetsMinOrder: pricedCart.meetsMinOrder,
      shortfallPaise: pricedCart.shortfallPaise,
      suggestedAddons,
      couponApplied: pricedCart.couponApplied,
      couponError: pricedCart.couponError,
      canDeliver: deliveryCheck.ok,
      deliveryReason: deliveryCheck.reason,
      deliveryMessage: deliveryCheck.message,
      etaMinutes: deliveryCheck.etaMinutes || 25,
      etaAt: deliveryCheck.etaAt || checkTimestamp + 25 * 60,
      estimatedArrivalIst: deliveryCheck.estimatedArrivalIst || '',
      latestOrderTime: deliveryCheck.latestOrderTime,
      suggestedGate: deliveryCheck.suggestedGate,
      alternativeGates: deliveryCheck.alternativeGates,
      availableSlots,
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

// POST /api/vendor-applications (Public vendor onboarding inquiry stored in D1)
publicRoutes.post('/vendor-applications', async (c) => {
  const db = c.get('db');
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';

  const maxApplyPerIp = c.env.DEMO_MODE === 'true' ? 100 : 10;
  const ipLimit = await checkRateLimit(db, `vendor_apply_ip:${clientIp}`, maxApplyPerIp, 600, c.env.RATE_LIMIT_KV);
  if (!ipLimit.allowed) {
    return c.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many onboarding submissions. Try again in ${ipLimit.retryAfterSeconds}s.`,
        },
      },
      429
    );
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = VendorApplicationInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: parsed.error.errors[0]?.message || 'Please check vendor onboarding details.',
        },
      },
      400
    );
  }

  const now = nowUtc();
  const id = ulid();
  await db.insert(vendorApplications).values({
    id,
    campusId: 'campus_nitp',
    vendorName: parsed.data.vendorName,
    shopType: parsed.data.shopType,
    phone: parsed.data.phone,
    status: 'pending',
    createdAt: now,
  });

  return c.json(
    {
      ok: true,
      application: {
        id,
        vendorName: parsed.data.vendorName,
        shopType: parsed.data.shopType,
        phone: parsed.data.phone,
        status: 'pending',
        createdAt: now,
      },
    },
    201
  );
});

// POST /api/analytics/events (Privacy-friendly zero-PII funnel telemetry)
publicRoutes.post('/analytics/events', async (c) => {
  if (c.req.header('dnt') === '1' || c.req.header('sec-gpc') === '1') {
    return c.json({ ok: true, recorded: false }, 202);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = AnalyticsEventInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: parsed.error.errors[0]?.message || 'Invalid funnel analytics event payload.',
        },
      },
      400
    );
  }

  const db = c.get('db');
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const maxEventsPerIp = c.env.DEMO_MODE === 'true' ? 500 : 120;
  const ipLimit = await checkRateLimit(db, `analytics_ip:${clientIp}`, maxEventsPerIp, 600, c.env.RATE_LIMIT_KV);
  if (!ipLimit.allowed) {
    return c.json({ ok: true, recorded: false }, 202);
  }

  const cleanRoute = parsed.data.route
    ? parsed.data.route.split(/[?#]/)[0].slice(0, 120)
    : null;

  await db.insert(funnelEvents).values({
    id: ulid(),
    eventName: parsed.data.event,
    route: cleanRoute,
    gateId: parsed.data.gateId || null,
    vendorId: parsed.data.vendorId || null,
    createdAt: nowUtc(),
  });

  return c.json({ ok: true, recorded: true }, 202);
});
