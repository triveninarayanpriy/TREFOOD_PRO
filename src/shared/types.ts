import { z } from 'zod';
export * from './schemas';
import type { Gate } from './schemas';

export const HealthResponseSchema = z.object({
  ok: z.boolean(),
  version: z.string(),
  commit: z.string(),
  db: z.boolean(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export interface MenuItemVariant {
  id: string;
  label: string;
  priceDeltaPaise: number;
}

export interface MenuItemAddon {
  id: string;
  label: string;
  pricePaise: number;
  isVeg?: boolean;
}

export interface EnrichedMenuItem {
  id: string;
  vendorId: string;
  categoryId: string;
  name: string;
  nameHi?: string | null;
  description: string;
  pricePaise: number;
  packingChargePaise?: number;
  imageUrl?: string | null;
  isVeg: boolean;
  tags: string[];
  variants?: MenuItemVariant[];
  addons?: MenuItemAddon[];
  inStock: boolean;
  sort: number;
}

export interface VendorSummary {
  id: string;
  slug: string;
  name: string;
  nameHi?: string | null;
  tagline?: string | null;
  category: string;
  cuisines?: string[];
  badges?: string[];
  coverImageUrl?: string | null;
  description: string;
  nightSafetyNotice?: string | null;
  fssaiNo: string;
  hoursJson?: string;
  prepMinutes: number;
  prepMaxMinutes?: number;
  minOrderPaise?: number;
  startingPricePaise?: number;
  minVegPricePaise?: number;
  hasVegItems?: boolean;
  hasNonVegItems?: boolean;
  offerTags?: string[];
  isOpen: boolean;
  busyUntil?: number | null;
  nightSafe?: boolean;
  dineInAvailable?: boolean;
  outOfStockCount?: number;
  status: 'pending' | 'active' | 'suspended';
  ratingAvg: number;
  ratingCount: number;
  canDeliverToGate?: boolean;
  deliveryReason?: string;
  deliveryMessage?: string;
  suggestedGate?: string;
  latestOrderTime?: string;
  etaMinutes?: number;
}

export interface VendorReview {
  id: string;
  orderId: string;
  vendorId: string;
  userId: string;
  reviewerName?: string;
  rating: number;
  comment?: string | null;
  createdAt: number;
}

export interface VendorDetail extends VendorSummary {
  phone?: string;
  hoursJson: string;
  outOfStockCount?: number;
  reviews?: VendorReview[];
  categories: Array<{
    id: string;
    name: string;
    nameHi?: string | null;
    sort: number;
    items: EnrichedMenuItem[];
  }>;
}

export interface QuickPickItem {
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
}

export interface SearchDishResult {
  id: string;
  vendorId: string;
  vendorSlug: string;
  vendorName: string;
  vendorCategory: string;
  vendorIsOpen: boolean;
  vendorRatingAvg: number;
  vendorNightSafe: boolean;
  canDeliverToGate: boolean;
  etaMinutes: number;
  name: string;
  nameHi?: string | null;
  description: string;
  pricePaise: number;
  isVeg: boolean;
  inStock: boolean;
  imageUrl?: string | null;
  tags: string[];
  hasCustomisation: boolean;
}

export interface CombinedSearchResponse {
  ok: boolean;
  query: string;
  vendors: VendorSummary[];
  dishes: SearchDishResult[];
  counts: {
    all: number;
    vendors: number;
    dishes: number;
  };
}

export interface CouponSummary {
  id: string;
  code: string;
  description: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  newUsersOnly: boolean;
}

export interface OrderItemLine {
  id: string;
  orderId: string;
  itemId: string;
  name: string;
  pricePaise: number;
  packingChargePaise?: number;
  quantity: number;
  notes?: string | null;
}

export interface OrderSummary {
  id: string;
  publicNo: string;
  vendorId: string;
  vendorSlug?: string;
  vendorName: string;
  gateId: string;
  gateName: string;
  status: 'placed' | 'accepted' | 'out_for_delivery' | 'at_gate' | 'delivered' | 'cancelled' | 'expired';
  subtotalPaise?: number;
  packingTotalPaise?: number;
  discountPaise?: number;
  totalPaise: number;
  handoverCode: string;
  etaAt?: number | null;
  atGateAt?: number | null;
  deliveredAt?: number | null;
  cancelledAt?: number | null;
  createdAt: number;
  hasReview?: boolean;
  items?: OrderItemLine[];
}

export interface OrderNotificationItem {
  id: string;
  orderId: string;
  publicNo: string;
  vendorName: string;
  gateName: string;
  status: string;
  title: string;
  summary: string;
  at: number;
}

export interface CampusSummaryResponse {
  ok: boolean;
  campus: {
    id: string;
    name: string;
    slug: string;
  };
  gates: Gate[];
  announcements: Array<{
    id: string;
    message: string;
    active: boolean;
    createdAt: number;
  }>;
  stats: {
    totalVendors: number;
    openVendorsCount: number;
    avgEtaMinutes: number;
    ordersHandedOver: number;
    serverTime: number;
    isSampleData: boolean;
  };
}
