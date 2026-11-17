import { useSyncExternalStore } from 'react';
import { BREAKPOINTS } from '../tokens';

function getInitialViewport(): { isMobile: boolean; isDesktop: boolean; width: number } {
  if (typeof window === 'undefined') {
    // Server-safe default: probe user-agent hint if available
    const isMobileUa =
      typeof navigator !== 'undefined' &&
      /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(
        navigator.userAgent || ''
      );
    return {
      isMobile: isMobileUa,
      isDesktop: !isMobileUa,
      width: isMobileUa ? 390 : 1280,
    };
  }

  const width = window.innerWidth;
  const isDesktop = width >= BREAKPOINTS.desktopMin;
  return {
    isMobile: !isDesktop,
    isDesktop,
    width,
  };
}

let currentSnapshot = getInitialViewport();
const listeners = new Set<() => void>();

function updateSnapshot() {
  if (typeof window === 'undefined') return;
  const width = window.innerWidth;
  const isDesktop = width >= BREAKPOINTS.desktopMin;
  const next = { isMobile: !isDesktop, isDesktop, width };
  if (
    next.isMobile !== currentSnapshot.isMobile ||
    next.isDesktop !== currentSnapshot.isDesktop ||
    next.width !== currentSnapshot.width
  ) {
    currentSnapshot = next;
    listeners.forEach((l) => l());
  }
}

if (typeof window !== 'undefined') {
  const mql = window.matchMedia(`(min-width: ${BREAKPOINTS.desktopMin}px)`);
  mql.addEventListener('change', updateSnapshot);
  window.addEventListener('resize', updateSnapshot, { passive: true });
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot() {
  return currentSnapshot;
}

function getServerSnapshot() {
  return currentSnapshot;
}

/**
 * useViewport ensures zero layout flash on first paint by using
 * sync external store hydration with client window or navigator hint.
 */
export function useViewport() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    ...snapshot,
    mode: snapshot.isDesktop ? ('desktop' as const) : ('mobile' as const),
  };
}
