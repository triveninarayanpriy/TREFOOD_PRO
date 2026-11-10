import { useState } from 'react';
import {
  ShoppingBag,
  MapPin,
  Globe,
  ChevronDown,
  Clock,
  Download,
  LogIn,
  Menu,
  X,
  UserCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { Gate } from '@shared/schemas';
import { getGateCurfewStatus } from '@shared/curfew';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';

export interface TopBarProps {
  currentGate: Gate | null;
  onOpenGatePicker: () => void;
  cartCount: number;
  onOpenCart: () => void;
  showDesktopLinks?: boolean;
  onInstallApp?: () => void;
  onOpenSignIn?: () => void;
}

const LANDING_ANCHORS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#for-vendors', label: 'For vendors' },
  { href: '#safety', label: 'Safety' },
  { href: '#faq', label: 'FAQ' },
];

export function TopBar({
  currentGate,
  onOpenGatePicker,
  cartCount,
  onOpenCart,
  showDesktopLinks = false,
  onInstallApp,
  onOpenSignIn,
}: TopBarProps) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 sm:px-4 py-2">
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 group rounded-xl shrink-0 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
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

        {/* Sticky Landing Navigation Links (Desktop >= 1024px) */}
        {showDesktopLinks ? (
          <nav aria-label="Landing navigation" className="hidden lg:flex items-center gap-0.5">
            {LANDING_ANCHORS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="inline-flex min-h-[44px] items-center rounded-xl px-3 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/browse"
              className="inline-flex min-h-[44px] items-center rounded-xl px-3 text-sm font-bold text-[#830020] dark:text-[#FFB400] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              Browse menus
            </Link>
          </nav>
        ) : (
          /* Gate Picker Slot on internal campus app routes */
          <button
            type="button"
            onClick={onOpenGatePicker}
            className="flex min-h-[44px] min-w-0 max-w-[132px] sm:max-w-[260px] items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 sm:px-3 py-1.5 text-left text-xs transition-colors hover:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
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
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {showDesktopLinks && onInstallApp && (
            <button
              type="button"
              onClick={onInstallApp}
              className="hidden sm:inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              <Download className="h-3.5 w-3.5 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
              <span>Install App</span>
            </button>
          )}

          <ThemeToggle />

          {!showDesktopLinks && (
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
          )}

          {showDesktopLinks ? (
            <>
              {user ? (
                <Link
                  to="/account"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#830020] px-3 text-xs font-bold text-white shadow-xs hover:bg-[#6a001a] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
                >
                  <UserCheck className="h-4 w-4 text-[#FFB400]" aria-hidden="true" />
                  <span className="max-w-[72px] truncate">{user.name?.split(' ')[0] || 'Account'}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onOpenSignIn}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#830020] px-3 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#6a001a] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
                >
                  <LogIn className="h-3.5 w-3.5 text-[#FFB400]" aria-hidden="true" />
                  <span>Sign in</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-expanded={mobileMenuOpen}
                aria-controls="landing-mobile-menu"
                aria-label="Toggle landing menu"
                className="inline-flex lg:hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
          ) : (
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
          )}
        </div>
      </div>

      {/* Collapsible Mobile Menu Drawer for Landing Page (supports 320px–1023px) */}
      {showDesktopLinks && mobileMenuOpen && (
        <nav
          id="landing-mobile-menu"
          aria-label="Mobile landing navigation"
          className="lg:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 space-y-1"
        >
          {LANDING_ANCHORS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[44px] items-center rounded-xl px-3 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)]"
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/browse"
            onClick={() => setMobileMenuOpen(false)}
            className="flex min-h-[44px] items-center rounded-xl px-3 text-sm font-bold text-[#830020] dark:text-[#FFB400] hover:bg-[var(--color-surface-sunken)]"
          >
            Browse menus
          </Link>
          {onInstallApp && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onInstallApp();
              }}
              className="flex w-full min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)]"
            >
              <Download className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
              <span>Install App</span>
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
