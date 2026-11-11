import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';

const SPLASH_SEEN_KEY = 'trefood_splash_seen';

export function SplashScreen() {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    // Never show to deep-link visitors or returning users
    const isRootHome = window.location.pathname === '/' && !window.location.search;
    if (!isRootHome) return false;
    return localStorage.getItem(SPLASH_SEEN_KEY) !== '1';
  });

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SPLASH_SEEN_KEY, '1');
    }
    setVisible(false);
  };

  useEffect(() => {
    if (!visible) return;
    // Mark as seen immediately so reloads / returning users never see splash again
    localStorage.setItem(SPLASH_SEEN_KEY, '1');
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delayMs = prefersReduced ? 400 : 1500;
    const timer = setTimeout(() => {
      setVisible(false);
    }, delayMs);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVisible(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <aside
      role="region"
      aria-label="Welcome to TreFood NIT Patna"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-[#FFB400]/40 bg-[#830020] px-5 py-4 text-white shadow-lg"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/images/brand/trefood-brand-logo.jpg"
            alt=""
            width={48}
            height={48}
            decoding="async"
            className="h-12 w-12 shrink-0 rounded-2xl object-cover border border-[#FFB400]/50 shadow-md"
          />
          <div className="min-w-0">
            <h2 className="font-display text-lg font-black tracking-tight text-white leading-tight">
              TreFood • NIT Patna
            </h2>
            <p className="text-xs font-semibold text-[#FDE68A] truncate">
              ₹0 Delivery Fee • 4-Digit Gate Code
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="inline-flex min-h-[44px] min-w-[68px] shrink-0 items-center justify-center rounded-xl border border-white/40 bg-[#5A0016] px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#420010] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
        >
          Skip
        </button>
      </div>

      <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-[11px] font-semibold text-amber-100">
        <ShieldCheck className="h-3.5 w-3.5 text-[#FFB400]" aria-hidden="true" />
        <span>Curfew-Aware Gate Routing • Night Safety 7 PM+</span>
      </div>
    </aside>
  );
}
