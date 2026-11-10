import { z } from 'zod';

// ==========================================
// Standard Error Response
// ==========================================
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// ==========================================
// Auth Schemas
// ==========================================
export const RequestOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  turnstileToken: z.string().optional(),
});

export type RequestOtpInput = z.infer<typeof RequestOtpSchema>;

export const VerifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().length(6, 'OTP must be 6 digits'),
  turnstileToken: z.string().optional(),
});

export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

export const MockGoogleLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(2).max(80),
  turnstileToken: z.string().optional(),
});

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['student', 'vendor', 'admin']),
  campusId: z.string(),
  vendorId: z.string().nullable().optional(),
});

export type User = z.infer<typeof UserSchema>;

// ==========================================
// Gates & Curfew
// ==========================================
export const GateSchema = z.object({
  id: z.string(),
  campusId: z.string(),
  name: z.string(),
  curfewTime: z.string(), // HH:MM
  bufferMinutes: z.number(),
  travelMinutes: z.number(),
  active: z.boolean(),
  is24x7: z.boolean().optional().default(false),
});

export type Gate = z.infer<typeof GateSchema>;

// ==========================================
// Vendor & Menu
// ==========================================
export const MenuItemSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  categoryId: z.string(),
  name: z.string(),
  nameHi: z.string().nullable().optional(),
  description: z.string(),
  pricePaise: z.number().int().nonnegative(),
  isVeg: z.boolean(),
  tags: z.array(z.string()),
  inStock: z.boolean(),
  sort: z.number(),
});

export type MenuItem = z.infer<typeof MenuItemSchema>;

export const MenuCategorySchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  name: z.string(),
  nameHi: z.string().nullable().optional(),
  sort: z.number(),
  items: z.array(MenuItemSchema).optional(),
});

export type MenuCategory = z.infer<typeof MenuCategorySchema>;

export const VendorListItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  nameHi: z.string().nullable().optional(),
  category: z.string(),
  description: z.string(),
  fssaiNo: z.string(),
  hoursJson: z.string().optional(),
  prepMinutes: z.number(),
  isOpen: z.boolean(),
  busyUntil: z.number().nullable().optional(),
  nightSafe: z.boolean().optional().default(true),
  status: z.enum(['pending', 'active', 'suspended']),
  ratingAvg: z.number(),
  ratingCount: z.number(),
  canDeliverToGate: z.boolean().optional(),
  deliveryReason: z.string().optional(),
  etaMinutes: z.number().optional(),
});

export type VendorListItem = z.infer<typeof VendorListItemSchema>;

// ==========================================
// Cart & Quote
// ==========================================
export const CartItemInputSchema = z.object({
  itemId: z.string(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  expectedPricePaise: z.number().int().nonnegative().optional(),
  notes: z.string().max(80, 'Item notes must be under 80 characters').optional(),
  variantId: z.string().optional(),
  addonIds: z.array(z.string()).optional(),
});

export type CartItemInputType = z.infer<typeof CartItemInputSchema>;

export const CartQuoteRequestSchema = z.object({
  vendorId: z.string(),
  gateId: z.string(),
  items: z.array(CartItemInputSchema).min(1, 'Cart cannot be empty'),
  couponCode: z.string().trim().max(32).optional(),
});

export type CartQuoteRequest = z.infer<typeof CartQuoteRequestSchema>;

export const CartPricedItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  pricePaise: z.number().int(),
  quantity: z.number().int(),
  subtotalPaise: z.number().int(),
  isVeg: z.boolean(),
  inStock: z.boolean(),
  notes: z.string().optional(),
});

export const CartQuoteResponseSchema = z.object({
  vendorId: z.string(),
  gateId: z.string(),
  items: z.array(CartPricedItemSchema),
  subtotalPaise: z.number().int(),
  deliveryFeePaise: z.literal(0),
  totalPaise: z.number().int(),
  totalQuantity: z.number().int(),
  etaMinutes: z.number(),
  etaAt: z.number(),
  estimatedArrivalIst: z.string(),
  canDeliver: z.boolean(),
  deliveryReason: z.string().optional(),
  alternativeGates: z.array(z.object({
    gateId: z.string(),
    gateName: z.string(),
    curfewTime: z.string(),
  })).optional(),
});

export type CartQuoteResponse = z.infer<typeof CartQuoteResponseSchema>;

// ==========================================
// Orders
// ==========================================
export const OrderStatusEnum = z.enum([
  'placed',
  'accepted',
  'out_for_delivery',
  'at_gate',
  'delivered',
  'cancelled',
  'expired',
]);

export type OrderStatusType = z.infer<typeof OrderStatusEnum>;

export const CreateOrderRequestSchema = z.object({
  vendorId: z.string(),
  gateId: z.string(),
  items: z.array(CartItemInputSchema).min(1, 'Must include at least one item'),
  couponCode: z.string().trim().max(32).optional(),
  paymentMethod: z.enum(['pay_at_gate', 'upi_simulated']).optional().default('pay_at_gate'),
  scheduledFor: z.number().int().optional(),
  note: z.string().max(200, 'Order note must be under 200 characters').optional(),
});

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

export const OrderItemSnapshotSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  name: z.string(),
  pricePaise: z.number().int(),
  quantity: z.number().int(),
  notes: z.string().nullable().optional(),
});

export const OrderEventSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  status: OrderStatusEnum,
  actorId: z.string().nullable().optional(),
  at: z.number().int(),
  note: z.string().nullable().optional(),
});

export const OrderDetailSchema = z.object({
  id: z.string(),
  publicNo: z.string(),
  campusId: z.string(),
  userId: z.string(),
  vendorId: z.string(),
  vendorName: z.string().optional(),
  vendorPhone: z.string().optional(),
  gateId: z.string(),
  gateName: z.string().optional(),
  status: OrderStatusEnum,
  subtotalPaise: z.number().int(),
  totalPaise: z.number().int(),
  paymentMethod: z.literal('pay_at_gate'),
  handoverCode: z.string().length(4),
  etaAt: z.number().nullable().optional(),
  placedAt: z.number().int(),
  acceptedAt: z.number().nullable().optional(),
  outForDeliveryAt: z.number().nullable().optional(),
  atGateAt: z.number().nullable().optional(),
  deliveredAt: z.number().nullable().optional(),
  cancelledAt: z.number().nullable().optional(),
  expiredAt: z.number().nullable().optional(),
  cancelReason: z.string().nullable().optional(),
  items: z.array(OrderItemSnapshotSchema).optional(),
  events: z.array(OrderEventSchema).optional(),
});

export type OrderDetail = z.infer<typeof OrderDetailSchema>;

export const CancelOrderSchema = z.object({
  reason: z.string().max(200, 'Reason under 200 chars').optional(),
});

export const ReviewOrderSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const IssueReportSchema = z.object({
  reason: z.enum(['wrong_item', 'missing_item', 'quality', 'late', 'not_at_gate', 'other']),
  description: z.string().min(5, 'Please provide more details').max(500),
});

export const ConfirmHandoverSchema = z.object({
  handoverCode: z.string().trim().length(4, 'Enter the 4-digit handover code from the packet'),
});

export const VendorRejectSchema = z.object({
  reason: z.string().trim().min(3, 'Provide a rejection reason').max(200),
});

export const CouponInputSchema = z.object({
  code: z.string().trim().min(3).max(24).toUpperCase(),
  description: z.string().min(3).max(200),
  discountType: z.enum(['percent', 'flat']),
  discountValue: z.number().int().positive(),
  minOrderPaise: z.number().int().nonnegative().default(0),
  maxDiscountPaise: z.number().int().nonnegative().nullable().optional(),
  newUsersOnly: z.boolean().default(false),
  active: z.boolean().default(true),
  expiresAt: z.number().int().nullable().optional(),
});

// ==========================================
// Public Vendor Onboarding Applications
// ==========================================
export const VENDOR_SHOP_TYPES = [
  'meals',
  'snacks',
  'fruits',
  'groceries',
  'vegetables',
  'raw_chicken',
  'late_night',
  'beverages',
] as const;

export const VendorApplicationInputSchema = z.object({
  vendorName: z
    .string()
    .trim()
    .min(2, 'Enter your shop or canteen name (at least 2 characters)')
    .max(80, 'Shop name must be under 80 characters'),
  shopType: z.enum(VENDOR_SHOP_TYPES, {
    errorMap: () => ({ message: 'Select a valid campus shop category' }),
  }),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, '').replace(/^\+91/, ''))
    .refine((v) => /^[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number'),
});

export type VendorApplicationInput = z.infer<typeof VendorApplicationInputSchema>;
