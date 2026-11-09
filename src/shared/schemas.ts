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
});

export type RequestOtpInput = z.infer<typeof RequestOtpSchema>;

export const VerifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().length(6, 'OTP must be 6 digits'),
});

export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

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
  prepMinutes: z.number(),
  isOpen: z.boolean(),
  busyUntil: z.number().nullable().optional(),
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
});

export type CartItemInputType = z.infer<typeof CartItemInputSchema>;

export const CartQuoteRequestSchema = z.object({
  vendorId: z.string(),
  gateId: z.string(),
  items: z.array(CartItemInputSchema).min(1, 'Cart cannot be empty'),
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
  reason: z.enum(['wrong_item', 'missing_item', 'quality', 'late', 'other']),
  description: z.string().min(5, 'Please provide more details').max(500),
});
