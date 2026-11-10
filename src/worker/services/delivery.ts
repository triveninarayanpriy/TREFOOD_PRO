import {
  evaluateCanDeliver,
  type CanDeliverOptions,
  type GateTimingInfo,
  type VendorTimingInfo,
  type VendorGateTimingInfo,
  type DeliveryEligibilityResult,
} from '@shared/curfew';

export type DeliveryReasonCode =
  | 'gate_closed'
  | 'vendor_closed'
  | 'vendor_busy'
  | 'unreachable'
  | 'too_late';

export type GateRecord = GateTimingInfo;
export type VendorRecord = VendorTimingInfo;
export type VendorGateRecord = VendorGateTimingInfo;
export type CanDeliverResult = DeliveryEligibilityResult;

export function canDeliver(
  gate: GateRecord,
  vendor: VendorRecord,
  nowUtcSeconds: number,
  vendorGate?: VendorGateRecord | null,
  allGates: GateRecord[] = [],
  options?: CanDeliverOptions
): CanDeliverResult {
  return evaluateCanDeliver(vendor, gate, nowUtcSeconds, vendorGate, allGates, options);
}
