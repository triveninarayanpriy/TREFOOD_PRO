// Pure domain utilities for Asia/Kolkata time, ETA computation, curfew checks, and Campus Night Safety

export const IST_OFFSET_SECONDS = 330 * 60; // UTC+05:30
export const NIGHT_SAFETY_START_HOUR = 19; // 7:00 PM IST

export interface GateTimingInfo {
  id: string;
  name: string;
  curfewTime: string; // HH:MM IST
  bufferMinutes: number;
  travelMinutes: number;
  active: boolean;
  is24x7?: boolean;
}

export interface VendorTimingInfo {
  id: string;
  name: string;
  hoursJson: string; // {"open":"HH:MM","close":"HH:MM"}
  prepMinutes: number;
  prepMaxMinutes?: number;
  isOpen: boolean;
  busyUntil?: number | null;
  status: string; // 'pending' | 'active' | 'suspended'
}

export interface VendorGateTimingInfo {
  vendorId: string;
  gateId: string;
  extraMinutes: number;
}

export interface EtaResult {
  minMinutes: number;
  maxMinutes: number;
  etaMinutes: number;
  etaAt: number; // UTC seconds
  estimatedArrivalIst: string; // HH:MM
}

export interface SuggestedGateInfo {
  gateId: string;
  gateName: string;
  curfewTime: string;
  is24x7?: boolean;
}

export interface DeliveryEligibilityResult {
  ok: boolean;
  reason?: 'gate_closed' | 'vendor_closed' | 'vendor_busy' | 'unreachable' | 'too_late';
  message?: string;
  etaMinutes?: number;
  minMinutes?: number;
  maxMinutes?: number;
  etaAt?: number;
  estimatedArrivalIst?: string;
  latestOrderTime?: string;
  suggestedGate?: SuggestedGateInfo | null;
  alternativeGates?: SuggestedGateInfo[];
}

export function getIstClock(utcSeconds: number): {
  hours: number;
  minutes: number;
  minutesOfDay: number;
  timeString: string;
} {
  const d = new Date((utcSeconds + IST_OFFSET_SECONDS) * 1000);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const minutesOfDay = hours * 60 + minutes;
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return { hours, minutes, minutesOfDay, timeString };
}

export function parseHHMM(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((s) => parseInt(s, 10));
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export function formatMinutesAsHHMM(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Campus Night Safety: after 7:00 PM IST (and overnight before 5:00 AM),
 * deliveries are handled personally by owner, co-owner, or senior staff.
 */
export function isNightSafetyActive(nowUtcSeconds: number = Math.floor(Date.now() / 1000)): boolean {
  const { hours } = getIstClock(nowUtcSeconds);
  return hours >= NIGHT_SAFETY_START_HOUR || hours < 5;
}

export function computeEtaMinutes(
  prepMinutes: number,
  travelMinutes: number,
  extraMinutes: number = 0
): number {
  return Math.max(5, prepMinutes + travelMinutes + extraMinutes);
}

/**
 * Computes delivery ETA window and IST arrival timestamp from vendor + gate parameters.
 */
export function computeEta(
  vendor: Pick<VendorTimingInfo, 'prepMinutes' | 'prepMaxMinutes'>,
  gate: Pick<GateTimingInfo, 'travelMinutes'>,
  nowUtcSeconds: number = Math.floor(Date.now() / 1000),
  vendorGate?: Pick<VendorGateTimingInfo, 'extraMinutes'> | null
): EtaResult {
  const travel = gate.travelMinutes + (vendorGate?.extraMinutes || 0);
  const minMinutes = Math.max(5, vendor.prepMinutes + travel);
  const prepMax = vendor.prepMaxMinutes && vendor.prepMaxMinutes > vendor.prepMinutes
    ? vendor.prepMaxMinutes
    : vendor.prepMinutes + 10;
  const maxMinutes = Math.max(minMinutes, prepMax + travel);
  const etaMinutes = minMinutes;
  const etaAt = nowUtcSeconds + etaMinutes * 60;

  const { minutesOfDay } = getIstClock(nowUtcSeconds);
  const estimatedArrivalIst = formatMinutesAsHHMM(minutesOfDay + etaMinutes);

  return { minMinutes, maxMinutes, etaMinutes, etaAt, estimatedArrivalIst };
}

function resolveAlternativeGates(
  vendor: VendorTimingInfo,
  nowUtcSeconds: number,
  allGates: GateTimingInfo[],
  excludeGateId: string
): SuggestedGateInfo[] {
  const alternatives: SuggestedGateInfo[] = [];
  const ist = getIstClock(nowUtcSeconds);

  for (const g of allGates) {
    if (g.id === excludeGateId || !g.active) continue;
    if (g.is24x7 || g.curfewTime.toLowerCase() === '24x7') {
      alternatives.push({
        gateId: g.id,
        gateName: g.name,
        curfewTime: '24x7',
        is24x7: true,
      });
      continue;
    }

    const curfewM = parseHHMM(g.curfewTime);
    const arrivalM = ist.minutesOfDay + vendor.prepMinutes + g.travelMinutes + g.bufferMinutes;
    let remaining = curfewM - arrivalM;
    if (curfewM < ist.minutesOfDay && curfewM < 360) {
      remaining = curfewM + 1440 - arrivalM;
    }
    if (remaining > 0) {
      alternatives.push({
        gateId: g.id,
        gateName: g.name,
        curfewTime: g.curfewTime,
        is24x7: false,
      });
    }
  }

  return alternatives;
}

/**
 * Pure delivery feasibility check matching Brief signature `canDeliver(vendor, gate, now)`
 * returning `{ ok, reason, message, suggestedGate, alternativeGates, latestOrderTime, ...eta }`.
 */
export function evaluateCanDeliver(
  vendor: VendorTimingInfo,
  gate: GateTimingInfo,
  nowUtcSeconds: number,
  vendorGate?: VendorGateTimingInfo | null,
  allGates: GateTimingInfo[] = []
): DeliveryEligibilityResult {
  const alternatives = () => resolveAlternativeGates(vendor, nowUtcSeconds, allGates, gate.id);

  if (!gate.active) {
    const alts = alternatives();
    return {
      ok: false,
      reason: 'gate_closed',
      message: `Gate ${gate.name} is currently inactive.`,
      suggestedGate: alts[0] ?? null,
      alternativeGates: alts,
    };
  }

  if (vendor.status !== 'active' || !vendor.isOpen) {
    return {
      ok: false,
      reason: 'vendor_closed',
      message: `${vendor.name} is currently closed.`,
    };
  }

  if (vendor.busyUntil && vendor.busyUntil > nowUtcSeconds) {
    const minutesRemaining = Math.ceil((vendor.busyUntil - nowUtcSeconds) / 60);
    return {
      ok: false,
      reason: 'vendor_busy',
      message: `${vendor.name} is temporarily busy. Accepting orders in ~${minutesRemaining} min.`,
    };
  }

  const ist = getIstClock(nowUtcSeconds);
  const currentMinutes = ist.minutesOfDay;
  try {
    const hours = JSON.parse(vendor.hoursJson) as { open: string; close: string };
    const openMinutes = parseHHMM(hours.open);
    const closeMinutes = parseHHMM(hours.close);

    const isOpenNow =
      closeMinutes >= openMinutes
        ? currentMinutes >= openMinutes && currentMinutes <= closeMinutes
        : currentMinutes >= openMinutes || currentMinutes <= closeMinutes;

    if (!isOpenNow) {
      return {
        ok: false,
        reason: 'vendor_closed',
        message: `${vendor.name} is closed. Operating hours are ${hours.open} to ${hours.close} IST.`,
      };
    }
  } catch {
    // Allow if hoursJson cannot be parsed
  }

  if (!vendorGate) {
    const alts = alternatives();
    return {
      ok: false,
      reason: 'unreachable',
      message: `${vendor.name} does not deliver to ${gate.name}.`,
      suggestedGate: alts[0] ?? null,
      alternativeGates: alts,
    };
  }

  const eta = computeEta(vendor, gate, nowUtcSeconds, vendorGate);

  if (gate.is24x7 || gate.curfewTime.toLowerCase() === '24x7') {
    return {
      ok: true,
      ...eta,
    };
  }

  const curfewMinutes = parseHHMM(gate.curfewTime);
  const arrivalWithBuffer = currentMinutes + eta.etaMinutes + gate.bufferMinutes;

  let minutesBeforeCurfew = curfewMinutes - arrivalWithBuffer;
  if (curfewMinutes < currentMinutes && curfewMinutes < 360) {
    minutesBeforeCurfew = curfewMinutes + 1440 - arrivalWithBuffer;
  }

  const latestOrderTime = formatMinutesAsHHMM(
    curfewMinutes - (eta.etaMinutes + gate.bufferMinutes)
  );

  if (minutesBeforeCurfew <= 0) {
    const alts = alternatives();
    return {
      ok: false,
      reason: 'too_late',
      message: `Order cannot reach ${gate.name} before ${gate.curfewTime} IST curfew (needs ${eta.etaMinutes}m delivery + ${gate.bufferMinutes}m gate window).`,
      estimatedArrivalIst: eta.estimatedArrivalIst,
      latestOrderTime,
      suggestedGate: alts[0] ?? null,
      alternativeGates: alts,
    };
  }

  return {
    ok: true,
    ...eta,
    latestOrderTime,
  };
}

export interface GateCurfewStatus {
  isOpen: boolean;
  is24x7: boolean;
  minutesRemaining: number | null;
  isNearingCurfew: boolean;
  label: string;
  latestOrderTime: string | null;
}

export function getGateCurfewStatus(
  gate: GateTimingInfo,
  nowUtcSeconds: number = Math.floor(Date.now() / 1000),
  samplePrepAndTravelMinutes: number = 25
): GateCurfewStatus {
  if (!gate.active) {
    return {
      isOpen: false,
      is24x7: Boolean(gate.is24x7),
      minutesRemaining: 0,
      isNearingCurfew: false,
      label: 'Gate closed',
      latestOrderTime: null,
    };
  }

  if (gate.is24x7 || gate.curfewTime.toLowerCase() === '24x7') {
    return {
      isOpen: true,
      is24x7: true,
      minutesRemaining: null,
      isNearingCurfew: false,
      label: 'Open 24x7',
      latestOrderTime: null,
    };
  }

  const { minutesOfDay } = getIstClock(nowUtcSeconds);
  const curfewMinutes = parseHHMM(gate.curfewTime);
  let remaining = curfewMinutes - minutesOfDay;

  if (curfewMinutes < minutesOfDay && curfewMinutes < 360) {
    remaining = curfewMinutes + 1440 - minutesOfDay;
  }

  const latestOrderTime = formatMinutesAsHHMM(
    curfewMinutes - (samplePrepAndTravelMinutes + gate.bufferMinutes)
  );

  if (remaining <= 0) {
    return {
      isOpen: false,
      is24x7: false,
      minutesRemaining: 0,
      isNearingCurfew: false,
      label: `Closed • Curfew ${gate.curfewTime}`,
      latestOrderTime,
    };
  }

  const canAcceptNewOrders = remaining > samplePrepAndTravelMinutes + gate.bufferMinutes;

  return {
    isOpen: true,
    is24x7: false,
    minutesRemaining: remaining,
    isNearingCurfew: remaining <= 60 || !canAcceptNewOrders,
    label:
      remaining <= 90
        ? `Closes in ${remaining}m (${gate.curfewTime})`
        : `Open until ${gate.curfewTime}`,
    latestOrderTime,
  };
}
