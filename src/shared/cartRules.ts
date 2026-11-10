// Pure cart pricing, single-vendor rule, minimum order, packing charge, and coupon discount logic

export interface CouponRule {
  code: string;
  discountType: 'percent' | 'flat';
  discountValue: number; // percent (1-100) or flat integer paise
  minOrderPaise: number;
  maxDiscountPaise?: number | null;
  newUsersOnly?: boolean;
  active: boolean;
  expiresAt?: number | null;
}

export interface PureCartLineItem {
  itemId: string;
  quantity: number;
  unitPricePaise: number;
  packingChargePaise?: number;
  variantDeltaPaise?: number;
  addonsTotalPaise?: number;
}

export interface CartPricingSummary {
  subtotalPaise: number;
  packingTotalPaise: number;
  discountPaise: number;
  deliveryFeePaise: 0;
  totalPaise: number;
  meetsMinOrder: boolean;
  shortfallPaise: number;
  couponApplied: string | null;
  couponError: string | null;
}

export function checkSingleVendor(
  existingVendorId: string | null | undefined,
  incomingVendorId: string,
  existingItemCount: number
): { allowed: boolean; conflictVendorId: string | null } {
  if (!existingVendorId || existingItemCount <= 0 || existingVendorId === incomingVendorId) {
    return { allowed: true, conflictVendorId: null };
  }
  return { allowed: false, conflictVendorId: existingVendorId };
}

export function evaluateCouponDiscount(
  coupon: CouponRule | null | undefined,
  subtotalPaise: number,
  isNewUser: boolean,
  nowUtcSeconds: number = Math.floor(Date.now() / 1000)
): { discountPaise: number; appliedCode: string | null; error: string | null } {
  if (!coupon) {
    return { discountPaise: 0, appliedCode: null, error: null };
  }

  if (!coupon.active) {
    return { discountPaise: 0, appliedCode: null, error: `Coupon ${coupon.code} is no longer active.` };
  }

  if (coupon.expiresAt && coupon.expiresAt < nowUtcSeconds) {
    return { discountPaise: 0, appliedCode: null, error: `Coupon ${coupon.code} has expired.` };
  }

  if (coupon.newUsersOnly && !isNewUser) {
    return {
      discountPaise: 0,
      appliedCode: null,
      error: `Coupon ${coupon.code} is valid on first orders only.`,
    };
  }

  if (subtotalPaise < coupon.minOrderPaise) {
    const needRupees = ((coupon.minOrderPaise - subtotalPaise) / 100).toFixed(0);
    return {
      discountPaise: 0,
      appliedCode: null,
      error: `Add ₹${needRupees} more to apply ${coupon.code} (min order ₹${(coupon.minOrderPaise / 100).toFixed(0)}).`,
    };
  }

  let discountPaise =
    coupon.discountType === 'percent'
      ? Math.round((subtotalPaise * coupon.discountValue) / 100)
      : coupon.discountValue;

  if (coupon.maxDiscountPaise && discountPaise > coupon.maxDiscountPaise) {
    discountPaise = coupon.maxDiscountPaise;
  }

  discountPaise = Math.max(0, Math.min(discountPaise, subtotalPaise));

  return {
    discountPaise,
    appliedCode: coupon.code,
    error: null,
  };
}

export function calculateCartPricing(params: {
  items: PureCartLineItem[];
  minOrderPaise?: number;
  coupon?: CouponRule | null;
  isNewUser?: boolean;
  nowUtcSeconds?: number;
}): CartPricingSummary {
  const { items, minOrderPaise = 0, coupon = null, isNewUser = false, nowUtcSeconds } = params;

  let subtotalPaise = 0;
  let packingTotalPaise = 0;

  for (const item of items) {
    const qty = Math.max(0, Math.floor(item.quantity));
    const unitEffective =
      item.unitPricePaise + (item.variantDeltaPaise || 0) + (item.addonsTotalPaise || 0);
    subtotalPaise += unitEffective * qty;
    packingTotalPaise += (item.packingChargePaise || 0) * qty;
  }

  const meetsMinOrder = subtotalPaise >= minOrderPaise;
  const shortfallPaise = Math.max(0, minOrderPaise - subtotalPaise);

  const couponEval = evaluateCouponDiscount(coupon, subtotalPaise, isNewUser, nowUtcSeconds);
  const totalPaise = Math.max(0, subtotalPaise + packingTotalPaise - couponEval.discountPaise);

  return {
    subtotalPaise,
    packingTotalPaise,
    discountPaise: couponEval.discountPaise,
    deliveryFeePaise: 0,
    totalPaise,
    meetsMinOrder,
    shortfallPaise,
    couponApplied: couponEval.appliedCode,
    couponError: couponEval.error,
  };
}
