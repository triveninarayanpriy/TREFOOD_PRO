export interface AdminMetrics {
  totalOrders: number;
  liveOrders: number;
  activeOrders: number;
  deliveredOrders: number;
  deliveredToday: number;
  cancelledOrders: number;
  totalRevenuePaise: number;
  totalRevenueRupees: number;
  activeVendorsCount: number;
  vendorsOpenCount: number;
  openComplaintsCount: number;
  avgGateEtaMinutes: number;
  acceptanceRate: number;
  cancellationRate: number;
  medianDeliveryMinutes: number;
  hourlyDistribution: number[];
  funnelCounts?: {
    view_menu: number;
    add_to_cart: number;
    checkout_start: number;
    order_placed: number;
    handover_confirmed: number;
  };
}

export interface VendorGateReachRow {
  gateId: string;
  extraMinutes: number;
}

export interface AdminVendor {
  id: string;
  name: string;
  slug: string;
  category: string;
  fssaiNo: string;
  phone: string;
  hoursJson: string;
  prepMinutes: number;
  isOpen: boolean;
  nightSafe: boolean;
  status: 'pending' | 'active' | 'suspended';
  gateReach: VendorGateReachRow[];
}

export interface AdminVendorApplication {
  id: string;
  campusId: string;
  vendorName: string;
  shopType: string;
  phone: string;
  status: 'pending' | 'reviewed' | 'approved';
  createdAt: number;
}

export interface AdminGate {
  id: string;
  name: string;
  curfewTime: string;
  bufferMinutes: number;
  travelMinutes: number;
  active: boolean;
  is24x7: boolean;
}

export interface AdminOrder {
  id: string;
  publicNo: string;
  vendorId: string;
  vendorName: string;
  gateId: string;
  gateName: string;
  status: string;
  totalPaise: number;
  handoverCode: string;
  paymentMethod: string;
  createdAt: number;
}

export interface AdminOrderEvent {
  id: string;
  status: string;
  at: number;
  note?: string | null;
}

export interface AdminCoupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  newUsersOnly: boolean;
  active: boolean;
  createdAt: number;
}

export interface AdminReport {
  id: string;
  orderId: string;
  orderPublicNo: string;
  orderTotalPaise?: number;
  vendorName: string;
  reason: string;
  description: string;
  status: 'open' | 'resolved' | 'refunded' | 'credited' | 'rejected';
  resolutionNote?: string | null;
  refundPaise?: number;
  createdAt: number;
}

export interface AdminSettlementRow {
  key: string;
  vendorId: string;
  vendorName: string;
  date: string;
  ordersCount: number;
  grossPaise: number;
  discountPaise: number;
  payAtGatePaise: number;
  upiPaise: number;
}

export interface AdminAnnouncement {
  id: string;
  message: string;
  active: boolean;
  createdAt: number;
}

export interface AdminAuditEntry {
  id: string;
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  detailsJson?: string | null;
  at: number;
}
