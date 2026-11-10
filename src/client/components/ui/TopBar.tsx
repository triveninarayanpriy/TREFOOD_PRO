import { ShoppingBag, MapPin, Globe, ChevronDown, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router-dom';
import type { Gate } from '@shared/schemas';
import { getGateCurfewStatus } from '@shared/curfew';
import { ThemeToggle } from './ThemeToggle';

export interface TopBarProps {
  currentGate: Gate | null;
  onOpenGatePicker: () => void;
  cartCount: number;
  onOpenCart: () => void;
  showDesktopLinks?: boolean;
}

export function TopBar({
  currentGate,
  onOpenGatePicker,
  cartCount,
  onOpenCart,
  showDesktopLinks = false,
}: TopBarProps) {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('trefood_lang', nextLang);
    }
  };

  const gateStatus = currentGate ? getGateCurfewStatus(currentGate) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2.5">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2 group rounded-xl shrink-0 focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[#830020] text-[#FFB400] shadow-xs transition-transform group-hover:scale-105 shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 14C4 9.58 7.58 6 12 6C16.42 6 20 9.58 20 14H4Z" fill="#FFB400" />
              <path d="M3 16.5H21C21 18.7 19.2 20.5 17 20.5H7C4.8 20.5 3 18.7 3 16.5Z" fill="#FFFFFF" />
              <circle cx="12" cy="4" r="1.5" fill="#FFB400" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 leading-none">
              <span className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-[#830020] dark:text-[#FFB400]">
                TreFood
              </span>
              <span className="hidden sm:inline-block rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-bold text-[#78350F] dark:bg-[#331F04] dark:text-[#FDE68A]">
                NITP
              </span>
            </div>
            <span className="block text-[11px] font-medium text-[var(--color-text-muted)]">
              NIT Patna<span className="hidden sm:inline"> • ₹0 Delivery Fee</span>
            </span>
          </div>
        </Link>

        {/* Optional Desktop Top Navigation Links (used on Landing /) */}
        {showDesktopLinks && (
          <nav aria-label="Desktop top navigation" className="hidden lg:flex items-center gap-1">
            <NavLink
              to="/browse"
              className="inline-flex min-h-[44px] items-center rounded-xl px-3.5 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              Browse Menus
            </NavLink>
            <NavLink
              to="/orders"
              className="inline-flex min-h-[44px] items-center rounded-xl px-3.5 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              Track Order
            </NavLink>
            <NavLink
              to="/v"
              className="inline-flex min-h-[44px] items-center rounded-xl px-3.5 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              For Vendors
            </NavLink>
            <NavLink
              to="/dev/ui"
              className="inline-flex min-h-[44px] items-center rounded-xl px-3.5 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              UI Kit
            </NavLink>
          </nav>
        )}

        {/* Gate Picker Slot */}
        <button
          type="button"
          onClick={onOpenGatePicker}
          className="flex min-h-[44px] min-w-0 max-w-[140px] sm:max-w-[260px] items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 sm:px-3 py-1.5 text-left text-xs transition-colors hover:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
          aria-label="Select delivery hostel gate"
        >
          <MapPin className="h-4 w-4 shrink-0 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold text-[var(--color-text)] leading-tight">
              {currentGate ? currentGate.name.split('(')[0].trim() : 'Choose Gate'}
            </div>
            {gateStatus && (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-[var(--color-text-muted)] truncate">
                <Clock className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                <span>{gateStatus.label}</span>
              </div>
            )}
          </div>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
        </button>

        {/* Right Actions: Theme Switch, Language Switch & Cart */}
        <div className="flex items-center gap-1.5">
          <ThemeToggle />

          <button
            type="button"
            onClick={toggleLanguage}
            className="hidden sm:inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            aria-label="Switch language between English and Hindi"
            title="Switch Language (English / हिन्दी)"
          >
            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{i18n.language === 'en' ? 'हिन्दी' : 'EN'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Open Cart with ${cartCount} items`}
            className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[#830020] text-white shadow-xs transition-transform hover:bg-[#6a001a] focus:outline-none focus:ring-2 focus:ring-[#FFB400] active:scale-95"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#FFB400] font-mono text-xs font-extrabold text-[#1C1917] ring-2 ring-[var(--color-surface)]">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
