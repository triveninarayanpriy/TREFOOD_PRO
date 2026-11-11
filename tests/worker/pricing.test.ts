import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from '@worker/db';
import { priceCart, CartConflictError } from '@worker/services/cart';
import { menuItems } from '@worker/db/schema';
import { checkSingleVendor, calculateCartPricing, type CouponRule } from '@shared/cartRules';

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    DB: D1Database;
    DEMO_MODE: string;
    ALLOWED_EMAIL_DOMAINS: string;
    TIMEZONE: string;
  }
}

describe('Pricing & Cart Service', () => {
  beforeAll(async () => {
    // Ensure test item exists in local D1
    const db = getDb(env.DB);
    await db
      .insert(menuItems)
      .values([
        {
          id: 'test_item_1',
          vendorId: 'rest_csb_nitp',
          categoryId: 'cat_csb_chai',
          name: 'Test Paneer',
          pricePaise: 16000, // ₹160
          isVeg: true,
          inStock: true,
          sort: 1,
          createdAt: 1700000000,
        },
        {
          id: 'test_item_oos',
          vendorId: 'rest_csb_nitp',
          categoryId: 'cat_csb_chai',
          name: 'Test Out of Stock Item',
          pricePaise: 12000,
          isVeg: true,
          inStock: false,
          sort: 2,
          createdAt: 1700000000,
        },
      ])
      .onConflictDoNothing();
  });

  it('correctly prices cart items in integer paise with zero delivery fee', async () => {
    const db = getDb(env.DB);
    const result = await priceCart(db, 'rest_csb_nitp', [
      { itemId: 'test_item_1', quantity: 2, expectedPricePaise: 16000 },
    ]);

    expect(result.subtotalPaise).toBe(32000); // 2 * 16000
    expect(result.deliveryFeePaise).toBe(0);
    expect(result.totalPaise).toBe(32000);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].subtotalPaise).toBe(32000);
  });

  it('throws 409 conflict when an item is out of stock', async () => {
    const db = getDb(env.DB);
    await expect(
      priceCart(db, 'rest_csb_nitp', [{ itemId: 'test_item_oos', quantity: 1 }])
    ).rejects.toThrowError(CartConflictError);
  });

  it('throws 409 conflict when item price has changed', async () => {
    const db = getDb(env.DB);
    await expect(
      priceCart(db, 'rest_csb_nitp', [
        { itemId: 'test_item_1', quantity: 1, expectedPricePaise: 15000 }, // Expected 15000, DB is 16000
      ])
    ).rejects.toThrowError(CartConflictError);
  });

  it('enforces single-vendor cart rule, minimum order, packing charges, and capped coupon discounts', () => {
    expect(checkSingleVendor('rest_csb_nitp', 'rest_csb_nitp', 2).allowed).toBe(true);
    expect(checkSingleVendor('rest_csb_nitp', 'rest_wrapchik_nitp', 2)).toEqual({
      allowed: false,
      conflictVendorId: 'rest_csb_nitp',
    });

    const coupon: CouponRule = {
      code: 'NEW50',
      discountType: 'percent',
      discountValue: 50,
      minOrderPaise: 9900,
      maxDiscountPaise: 6000,
      newUsersOnly: true,
      active: true,
    };

    // Below vendor minimum order (shortfall)
    const belowMin = calculateCartPricing({
      items: [{ itemId: 'a', quantity: 1, unitPricePaise: 6000, packingChargePaise: 500 }],
      minOrderPaise: 9900,
      coupon,
      isNewUser: true,
    });
    expect(belowMin.meetsMinOrder).toBe(false);
    expect(belowMin.shortfallPaise).toBe(3900);
    expect(belowMin.packingTotalPaise).toBe(500);
    expect(belowMin.discountPaise).toBe(0);
    expect(belowMin.couponError).toContain('Add ₹39 more');

    // Meets minimum order & caps percent discount at 6000 paise (Rs 60)
    const eligible = calculateCartPricing({
      items: [{ itemId: 'a', quantity: 2, unitPricePaise: 10000, packingChargePaise: 500 }],
      minOrderPaise: 9900,
      coupon,
      isNewUser: true,
    });
    expect(eligible.meetsMinOrder).toBe(true);
    expect(eligible.subtotalPaise).toBe(20000);
    expect(eligible.packingTotalPaise).toBe(1000);
    expect(eligible.discountPaise).toBe(6000);
    expect(eligible.totalPaise).toBe(15000);

    // Returning user rejected on newUsersOnly coupon
    const returningUserEval = calculateCartPricing({
      items: [{ itemId: 'a', quantity: 2, unitPricePaise: 10000 }],
      coupon,
      isNewUser: false,
    });
    expect(returningUserEval.discountPaise).toBe(0);
    expect(returningUserEval.couponError).toContain('first orders only');

    // Expired and inactive coupons rejected cleanly
    const expiredCoupon: CouponRule = {
      ...coupon,
      code: 'OLD20',
      newUsersOnly: false,
      expiresAt: 1700000000,
    };
    const expiredEval = calculateCartPricing({
      items: [{ itemId: 'a', quantity: 2, unitPricePaise: 10000 }],
      coupon: expiredCoupon,
      isNewUser: true,
      nowUtcSeconds: 1800000000,
    });
    expect(expiredEval.discountPaise).toBe(0);
    expect(expiredEval.couponError).toContain('expired');

    const flatCoupon: CouponRule = {
      code: 'FLAT25',
      discountType: 'flat',
      discountValue: 2500,
      minOrderPaise: 14900,
      active: true,
    };
    const flatEval = calculateCartPricing({
      items: [{ itemId: 'a', quantity: 1, unitPricePaise: 15000, packingChargePaise: 500 }],
      coupon: flatCoupon,
      isNewUser: false,
    });
    expect(flatEval.discountPaise).toBe(2500);
    expect(flatEval.totalPaise).toBe(13000); // 15000 + 500 - 2500
  });
});
