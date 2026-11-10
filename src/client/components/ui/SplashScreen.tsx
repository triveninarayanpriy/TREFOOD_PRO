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
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to TreFood NIT Patna"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#830020] px-6 py-10 text-white"
    >
      <div className="flex w-full max-w-md justify-end">
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex min-h-[44px] min-w-[76px] items-center justify-center rounded-xl border border-white/40 bg-[#5A0016] px-5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#420010] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
        >
          Skip
        </button>
      </div>

      <div className="flex flex-col items-center text-center space-y-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#FFB400] text-[#1C1917] shadow-2xl">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 14C4 9.58 7.58 6 12 6C16.42 6 20 9.58 20 14H4Z" fill="#830020" />
            <path d="M3 16.5H21C21 18.7 19.2 20.5 17 20.5H7C4.8 20.5 3 18.7 3 16.5Z" fill="#1C1917" />
            <circle cx="12" cy="4" r="1.5" fill="#830020" />
          </svg>
        </div>

        <div className="space-y-1">
          <h2 className="font-display text-4xl font-black tracking-tight text-white">TreFood</h2>
          <p className="text-sm font-semibold text-[#FDE68A]">
            NIT Patna Campus Delivery • ₹0 Fee
          </p>
        </div>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full bg-black/25 px-4 py-2 text-xs font-semibold text-amber-100">
        <ShieldCheck className="h-4 w-4 text-[#FFB400]" aria-hidden="true" />
        <span>4-Digit Gate Code • Curfew Aware</span>
      </div>
    </div>
  );
}
