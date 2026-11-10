import { z } from 'zod';
export * from './schemas';

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

export interface VendorSummary {
  id: string;
  slug: string;
  name: string;
  nameHi?: string | null;
  category: string;
  description: string;
  fssaiNo: string;
  hoursJson?: string;
  prepMinutes: number;
  isOpen: boolean;
  busyUntil?: number | null;
  nightSafe?: boolean;
  status: 'pending' | 'active' | 'suspended';
  ratingAvg: number;
  ratingCount: number;
  canDeliverToGate?: boolean;
  deliveryReason?: string;
  deliveryMessage?: string;
  etaMinutes?: number;
}

export interface VendorDetail extends VendorSummary {
  hoursJson: string;
  categories: Array<{
    id: string;
    name: string;
    nameHi?: string | null;
    sort: number;
    items: Array<{
      id: string;
      vendorId: string;
      categoryId: string;
      name: string;
      nameHi?: string | null;
      description: string;
      pricePaise: number;
      isVeg: boolean;
      tags: string[];
      inStock: boolean;
      sort: number;
    }>;
  }>;
}

export interface OrderSummary {
  id: string;
  publicNo: string;
  vendorId: string;
  vendorName: string;
  gateId: string;
  gateName: string;
  status: 'placed' | 'accepted' | 'out_for_delivery' | 'at_gate' | 'delivered' | 'cancelled' | 'expired';
  totalPaise: number;
  handoverCode: string;
  createdAt: number;
}
