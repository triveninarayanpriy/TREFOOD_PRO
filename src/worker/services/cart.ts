import { eq, and, inArray, count } from 'drizzle-orm';
import type { Database } from '../db';
import { menuItems, vendors, coupons, orders } from '../db/schema';
import { calculateCartPricing, type CouponRule } from '@shared/cartRules';

export interface CartItemInput {
  itemId: string;
  quantity: number;
  expectedPricePaise?: number;
  notes?: string;
  variantId?: string;
  addonIds?: string[];
}

export interface CartItemPriced {
  itemId: string;
  name: string;
  pricePaise: number;
  packingChargePaise: number;
  quantity: number;
  subtotalPaise: number;
  isVeg: boolean;
  inStock: boolean;
  notes?: string;
}

export interface CartQuoteResult {
  vendorId: string;
  items: CartItemPriced[];
  subtotalPaise: number;
  packingTotalPaise: number;
  discountPaise: number;
  deliveryFeePaise: number; // Always 0
  totalPaise: number;
  totalQuantity: number;
  meetsMinOrder: boolean;
  shortfallPaise: number;
  couponApplied: string | null;
  couponError: string | null;
}

export class CartConflictError extends Error {
  public code: 'ITEM_OUT_OF_STOCK' | 'PRICE_CHANGED' | 'MIN_ORDER_NOT_MET';
  public status = 409;
  public details: unknown;

  constructor(
    code: 'ITEM_OUT_OF_STOCK' | 'PRICE_CHANGED' | 'MIN_ORDER_NOT_MET',
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'CartConflictError';
    this.code = code;
    this.details = details;
  }
}

export async function priceCart(
  db: Database,
  vendorId: string,
  clientItems: CartItemInput[],
  options?: {
    couponCode?: string;
    userId?: string;
    nowUtcSeconds?: number;
  }
): Promise<CartQuoteResult> {
  if (!clientItems || clientItems.length === 0) {
    return {
      vendorId,
      items: [],
      subtotalPaise: 0,
      packingTotalPaise: 0,
      discountPaise: 0,
      deliveryFeePaise: 0,
      totalPaise: 0,
      totalQuantity: 0,
      meetsMinOrder: true,
      shortfallPaise: 0,
      couponApplied: null,
      couponError: null,
    };
  }

  const itemIds = clientItems.map((i) => i.itemId);

  const [dbItems, vendorRow] = await Promise.all([
    db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.vendorId, vendorId), inArray(menuItems.id, itemIds))),
    db.select().from(vendors).where(eq(vendors.id, vendorId)).get(),
  ]);

  const dbItemMap = new Map(dbItems.map((item) => [item.id, item]));

  const pricedItems: CartItemPriced[] = [];
  const lineInputs: Array<{
    itemId: string;
    quantity: number;
    unitPricePaise: number;
    packingChargePaise: number;
    variantDeltaPaise: number;
    addonsTotalPaise: number;
  }> = [];

  let totalQuantity = 0;

  for (const clientItem of clientItems) {
    const dbItem = dbItemMap.get(clientItem.itemId);

    if (!dbItem) {
      throw new CartConflictError(
        'ITEM_OUT_OF_STOCK',
        `Item with ID "${clientItem.itemId}" is no longer available on this vendor's menu.`,
        { itemId: clientItem.itemId }
      );
    }

    if (!dbItem.inStock) {
      throw new CartConflictError(
        'ITEM_OUT_OF_STOCK',
        `"${dbItem.name}" is currently out of stock.`,
        { itemId: dbItem.id, name: dbItem.name }
      );
    }

    // Resolve optional server-verified variant & addons deltas
    let variantDeltaPaise = 0;
    let selectedVariantLabel: string | null = null;
    if (clientItem.variantId) {
      try {
        const variants = JSON.parse(dbItem.variantsJson || '[]') as Array<{
          id: string;
          label?: string;
          priceDeltaPaise: number;
        }>;
        const foundVariant = variants.find((v) => v.id === clientItem.variantId);
        if (foundVariant) {
          variantDeltaPaise = foundVariant.priceDeltaPaise;
          if (foundVariant.label) selectedVariantLabel = foundVariant.label;
        }
      } catch {}
    }

    let addonsTotalPaise = 0;
    const selectedAddonLabels: string[] = [];
    if (clientItem.addonIds && clientItem.addonIds.length > 0) {
      try {
        const addons = JSON.parse(dbItem.addonsJson || '[]') as Array<{
          id: string;
          label?: string;
          pricePaise: number;
        }>;
        for (const aid of clientItem.addonIds) {
          const foundAddon = addons.find((a) => a.id === aid);
          if (foundAddon) {
            addonsTotalPaise += foundAddon.pricePaise;
            if (foundAddon.label) selectedAddonLabels.push(foundAddon.label);
          }
        }
      } catch {}
    }

    const effectiveUnit = dbItem.pricePaise + variantDeltaPaise + addonsTotalPaise;

    if (
      clientItem.expectedPricePaise !== undefined &&
      clientItem.expectedPricePaise !== effectiveUnit
    ) {
      throw new CartConflictError(
        'PRICE_CHANGED',
        `Price for "${dbItem.name}" has changed from ₹${(clientItem.expectedPricePaise / 100).toFixed(2)} to ₹${(effectiveUnit / 100).toFixed(2)}.`,
        {
          itemId: dbItem.id,
          name: dbItem.name,
          oldPricePaise: clientItem.expectedPricePaise,
          newPricePaise: effectiveUnit,
        }
      );
    }

    const itemSubtotal = effectiveUnit * clientItem.quantity;
    const packingChargePaise = dbItem.packingChargePaise || 0;
    totalQuantity += clientItem.quantity;

    const suffixes: string[] = [];
    if (selectedVariantLabel) suffixes.push(selectedVariantLabel);
    if (selectedAddonLabels.length > 0) suffixes.push(`+ ${selectedAddonLabels.join(', ')}`);
    const displayName = suffixes.length > 0 ? `${dbItem.name} (${suffixes.join(' • ')})` : dbItem.name;

    lineInputs.push({
      itemId: dbItem.id,
      quantity: clientItem.quantity,
      unitPricePaise: dbItem.pricePaise,
      packingChargePaise,
      variantDeltaPaise,
      addonsTotalPaise,
    });

    pricedItems.push({
      itemId: dbItem.id,
      name: displayName,
      pricePaise: effectiveUnit,
      packingChargePaise,
      quantity: clientItem.quantity,
      subtotalPaise: itemSubtotal,
      isVeg: dbItem.isVeg,
      inStock: dbItem.inStock,
      notes: clientItem.notes,
    });
  }

  let couponRule: CouponRule | null = null;
  let couponLookupError: string | null = null;
  let isNewUser = true;

  if (options?.couponCode) {
    const cleanCode = options.couponCode.trim().toUpperCase();
    const dbCoupon = await db.select().from(coupons).where(eq(coupons.code, cleanCode)).get();
    if (!dbCoupon) {
      couponLookupError = `Coupon "${cleanCode}" not found.`;
    } else {
      couponRule = {
        code: dbCoupon.code,
        discountType: dbCoupon.discountType,
        discountValue: dbCoupon.discountValue,
        minOrderPaise: dbCoupon.minOrderPaise,
        maxDiscountPaise: dbCoupon.maxDiscountPaise,
        newUsersOnly: dbCoupon.newUsersOnly,
        active: dbCoupon.active,
        expiresAt: dbCoupon.expiresAt,
      };
    }

    if (options.userId && couponRule?.newUsersOnly) {
      const prevOrders = await db
        .select({ total: count() })
        .from(orders)
        .where(eq(orders.userId, options.userId))
        .get();
      isNewUser = (prevOrders?.total || 0) === 0;
    }
  }

  const summary = calculateCartPricing({
    items: lineInputs,
    minOrderPaise: vendorRow?.minOrderPaise || 0,
    coupon: couponRule,
    isNewUser,
    nowUtcSeconds: options?.nowUtcSeconds,
  });

  return {
    vendorId,
    items: pricedItems,
    subtotalPaise: summary.subtotalPaise,
    packingTotalPaise: summary.packingTotalPaise,
    discountPaise: summary.discountPaise,
    deliveryFeePaise: 0,
    totalPaise: summary.totalPaise,
    totalQuantity,
    meetsMinOrder: summary.meetsMinOrder,
    shortfallPaise: summary.shortfallPaise,
    couponApplied: summary.couponApplied,
    couponError: couponLookupError || summary.couponError,
  };
}
