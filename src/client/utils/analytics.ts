import type { FunnelEventName } from '@shared/schemas';

export interface FunnelEventMeta {
  route?: string;
  gateId?: string;
  vendorId?: string;
}

/**
 * Privacy-friendly zero-PII funnel telemetry helper.
 * Honors browser DNT / Global Privacy Control and never transmits user identifiers.
 */
export function trackFunnelEvent(event: FunnelEventName, meta: FunnelEventMeta = {}): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

  const gpcEnabled = Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl);
  if (navigator.doNotTrack === '1' || gpcEnabled) {
    return;
  }

  const rawRoute = meta.route || window.location.pathname || '/';
  const cleanRoute = rawRoute.split(/[?#]/)[0].slice(0, 120);

  const payload: {
    event: FunnelEventName;
    route?: string;
    gateId?: string;
    vendorId?: string;
  } = { event, route: cleanRoute };

  if (meta.gateId) payload.gateId = meta.gateId.slice(0, 40);
  if (meta.vendorId) payload.vendorId = meta.vendorId.slice(0, 40);

  const body = JSON.stringify(payload);

  try {
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      const sent = navigator.sendBeacon('/api/analytics/events', blob);
      if (sent) return;
    }
    void fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Non-blocking telemetry
  }
}
