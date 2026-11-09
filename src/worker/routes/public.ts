import { Hono } from 'hono';
import { eq, and, asc } from 'drizzle-orm';
import type { Env } from '../types';
import {
  gates,
  vendors,
  vendorGates,
  menuCategories,
  menuItems,
  announcements,
} from '../db/schema';
import { canDeliver } from '../services/delivery';
import { priceCart, CartConflictError } from '../services/cart';
import { nowUtc } from '../utils/time';
import { CartQuoteRequestSchema } from '@shared/schemas';

export const publicRoutes = new Hono<{ Bindings: Env }>();

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
  const gateId = c.req.query('gate');
  const category = c.req.query('category');
  const q = c.req.query('q')?.toLowerCase();
  const vegOnly = c.req.query('veg') === 'true' || c.req.query('veg') === '1';
  const openOnly = c.req.query('open') === 'true' || c.req.query('open') === '1';

  const now = nowUtc();

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

    // Gate filtering & delivery check
    if (targetGate) {
      const vg = vendorGateMap.get(v.id);
      // Domain rule: A vendor is listed only if it is open and can reach the chosen gate.
      if (!vg) {
        // Cannot reach the gate -> do not list
        continue;
      }

      const deliveryCheck = canDeliver(targetGate, v, now, vg, allGates);

      results.push({
        id: v.id,
        slug: v.slug,
        name: v.name,
        nameHi: v.nameHi,
        category: v.category,
        description: v.description,
        fssaiNo: v.fssaiNo,
        prepMinutes: v.prepMinutes,
        isOpen: v.isOpen,
        busyUntil: v.busyUntil,
        status: v.status,
        ratingAvg: v.ratingAvg,
        ratingCount: v.ratingCount,
        canDeliverToGate: deliveryCheck.ok,
        deliveryReason: deliveryCheck.reason,
        deliveryMessage: deliveryCheck.message,
        etaMinutes: deliveryCheck.etaMinutes,
      });
    } else {
      results.push({
        id: v.id,
        slug: v.slug,
        name: v.name,
        nameHi: v.nameHi,
        category: v.category,
        description: v.description,
        fssaiNo: v.fssaiNo,
        prepMinutes: v.prepMinutes,
        isOpen: v.isOpen,
        busyUntil: v.busyUntil,
        status: v.status,
        ratingAvg: v.ratingAvg,
        ratingCount: v.ratingCount,
      });
    }
  }

  return c.json({ ok: true, vendors: results });
});

// GET /api/vendors/:slug (Vendor profile and full menu grouped by category)
publicRoutes.get('/vendors/:slug', async (c) => {
  const db = c.get('db');
  const slug = c.req.param('slug');

  const vendor = await db
    .select()
    .from(vendors)
    .where(eq(vendors.slug, slug))
    .get();

  if (!vendor) {
    return c.json({ error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor not found.' } }, 404);
  }

  // Fetch categories sorted
  const categories = await db
    .select()
    .from(menuCategories)
    .where(eq(menuCategories.vendorId, vendor.id))
    .orderBy(asc(menuCategories.sort))
    .all();

  // Fetch items sorted
  const items = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.vendorId, vendor.id))
    .orderBy(asc(menuItems.sort))
    .all();

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
      isOpen: vendor.isOpen,
      busyUntil: vendor.busyUntil,
      status: vendor.status,
      ratingAvg: vendor.ratingAvg,
      ratingCount: vendor.ratingCount,
    },
    categories: structuredCategories,
  });
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

  const { vendorId, gateId, items } = parseResult.data;
  const now = nowUtc();

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
    const pricedCart = await priceCart(db, vendorId, items);

    return c.json({
      ok: true,
      vendorId,
      gateId,
      items: pricedCart.items,
      subtotalPaise: pricedCart.subtotalPaise,
      deliveryFeePaise: 0,
      totalPaise: pricedCart.totalPaise,
      totalQuantity: pricedCart.totalQuantity,
      canDeliver: deliveryCheck.ok,
      deliveryReason: deliveryCheck.reason,
      deliveryMessage: deliveryCheck.message,
      etaMinutes: deliveryCheck.etaMinutes || 25,
      etaAt: deliveryCheck.etaAt || now + 25 * 60,
      estimatedArrivalIst: deliveryCheck.estimatedArrivalIst || '',
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
