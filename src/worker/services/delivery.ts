import { getIstComponents, parseTimeToMinutes } from '../utils/time';

export type DeliveryReasonCode =
  | 'gate_closed'
  | 'vendor_closed'
  | 'vendor_busy'
  | 'unreachable'
  | 'too_late';

export interface GateRecord {
  id: string;
  name: string;
  curfewTime: string; // HH:MM
  bufferMinutes: number;
  travelMinutes: number;
  active: boolean;
}

export interface VendorRecord {
  id: string;
  name: string;
  hoursJson: string; // {"open":"HH:MM","close":"HH:MM"}
  prepMinutes: number;
  isOpen: boolean;
  busyUntil?: number | null; // UTC seconds
  status: string; // 'pending' | 'active' | 'suspended'
}

export interface VendorGateRecord {
  vendorId: string;
  gateId: string;
  extraMinutes: number;
}

export interface CanDeliverResult {
  ok: boolean;
  reason?: DeliveryReasonCode;
  message?: string;
  etaMinutes?: number;
  etaAt?: number; // UTC seconds
  estimatedArrivalIst?: string;
  alternativeGates?: Array<{ gateId: string; gateName: string; curfewTime: string }>;
}

export function canDeliver(
  gate: GateRecord,
  vendor: VendorRecord,
  nowUtcSeconds: number,
  vendorGate?: VendorGateRecord | null,
  allGates: GateRecord[] = []
): CanDeliverResult {
  // 1. Check gate active
  if (!gate.active) {
    return {
      ok: false,
      reason: 'gate_closed',
      message: `Gate ${gate.name} is currently inactive.`,
      alternativeGates: getAlternativeGates(vendor, nowUtcSeconds, allGates, gate.id),
    };
  }

  // 2. Check vendor active & open
  if (vendor.status !== 'active' || !vendor.isOpen) {
    return {
      ok: false,
      reason: 'vendor_closed',
      message: `${vendor.name} is currently closed.`,
    };
  }

  // 3. Check vendor busy mode
  if (vendor.busyUntil && vendor.busyUntil > nowUtcSeconds) {
    const minutesRemaining = Math.ceil((vendor.busyUntil - nowUtcSeconds) / 60);
    return {
      ok: false,
      reason: 'vendor_busy',
      message: `${vendor.name} is temporarily busy. Accepting orders in ~${minutesRemaining} min.`,
    };
  }

  // 4. Check vendor operating hours in Asia/Kolkata
  const ist = getIstComponents(nowUtcSeconds);
  const currentMinutes = ist.minutesOfDay;
  try {
    const hours = JSON.parse(vendor.hoursJson) as { open: string; close: string };
    const openMinutes = parseTimeToMinutes(hours.open);
    const closeMinutes = parseTimeToMinutes(hours.close);

    let isOpenNow = false;
    if (closeMinutes >= openMinutes) {
      // Normal daytime hours e.g. 10:00 to 23:00
      isOpenNow = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
    } else {
      // Late night wrapping past midnight e.g. 21:00 to 03:00
      isOpenNow = currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
    }

    if (!isOpenNow) {
      return {
        ok: false,
        reason: 'vendor_closed',
        message: `${vendor.name} is closed. Operating hours are ${hours.open} to ${hours.close} IST.`,
      };
    }
  } catch {
    // If invalid JSON, treat as open
  }

  // 5. Check vendor-gate reachability
  if (!vendorGate) {
    return {
      ok: false,
      reason: 'unreachable',
      message: `${vendor.name} does not deliver to ${gate.name}.`,
      alternativeGates: getAlternativeGates(vendor, nowUtcSeconds, allGates, gate.id),
    };
  }

  // 6. Curfew check
  const totalTravelMinutes = gate.travelMinutes + (vendorGate.extraMinutes || 0);
  const totalDurationMinutes = vendor.prepMinutes + totalTravelMinutes;
  const etaMinutes = totalDurationMinutes;
  const etaAt = nowUtcSeconds + totalDurationMinutes * 60;

  const curfewMinutes = parseTimeToMinutes(gate.curfewTime);
  const arrivalMinutes = currentMinutes + totalDurationMinutes + gate.bufferMinutes;

  let minutesBeforeCurfew = curfewMinutes - arrivalMinutes;
  // If curfew wraps past midnight (e.g. 01:00 AM) and current time is late evening
  if (curfewMinutes < currentMinutes && curfewMinutes < 360) {
    minutesBeforeCurfew = (curfewMinutes + 1440) - arrivalMinutes;
  }

  const arrivalH = Math.floor((currentMinutes + totalDurationMinutes) % 1440 / 60);
  const arrivalM = (currentMinutes + totalDurationMinutes) % 60;
  const estimatedArrivalIst = `${arrivalH.toString().padStart(2, '0')}:${arrivalM.toString().padStart(2, '0')}`;

  if (minutesBeforeCurfew <= 0) {
    return {
      ok: false,
      reason: 'too_late',
      message: `Order cannot reach ${gate.name} before curfew (${gate.curfewTime} IST with ${gate.bufferMinutes}m buffer).`,
      estimatedArrivalIst,
      alternativeGates: getAlternativeGates(vendor, nowUtcSeconds, allGates, gate.id),
    };
  }

  return {
    ok: true,
    etaMinutes,
    etaAt,
    estimatedArrivalIst,
  };
}

function getAlternativeGates(
  vendor: VendorRecord,
  nowUtcSeconds: number,
  allGates: GateRecord[],
  excludeGateId: string
): Array<{ gateId: string; gateName: string; curfewTime: string }> {
  const alternatives: Array<{ gateId: string; gateName: string; curfewTime: string }> = [];
  const ist = getIstComponents(nowUtcSeconds);

  for (const g of allGates) {
    if (g.id === excludeGateId || !g.active) continue;
    const curfewM = parseTimeToMinutes(g.curfewTime);
    const arrivalM = ist.minutesOfDay + vendor.prepMinutes + g.travelMinutes + g.bufferMinutes;
    if (curfewM > arrivalM) {
      alternatives.push({
        gateId: g.id,
        gateName: g.name,
        curfewTime: g.curfewTime,
      });
    }
  }

  return alternatives;
}
