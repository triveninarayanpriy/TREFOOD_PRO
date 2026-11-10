import { useState, lazy, Suspense } from 'react';
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
  Heart,
  Bell,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Gate } from '@shared/schemas';
import { getGateCurfewStatus } from '@shared/curfew';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';

const GatePicker = lazy(() =>
  import('./GatePicker').then((m) => ({ default: m.GatePicker }))
);

export interface TopBarProps {
  gates?: Gate[];
  currentGate: Gate | null;
  selectedGateId: string;
  onSelectGate: (gateId: string) => void;
  gatePickerOpen: boolean;
  onToggleGatePicker: (open: boolean) => void;
  cartCount: number;
  onOpenCart: () => void;
  showDesktopLinks?: boolean;
  onInstallApp?: () => void;
  onOpenNotifications?: () => void;
}

const LANDING_ANCHORS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#for-vendors', label: 'For vendors' },
  { href: '#safety', label: 'Safety' },
  { href: '#faq', label: 'FAQ' },
];

export function TopBar({
  gates = [],
  currentGate,
  selectedGateId,
  onSelectGate,
  gatePickerOpen,
  onToggleGatePicker,
  cartCount,
  onOpenCart,
  showDesktopLinks = false,
  onInstallApp,
  onOpenNotifications,
}: TopBarProps) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('trefood_lang', nextLang);
    }
  };

  const gateStatus = currentGate ? getGateCurfewStatus(currentGate) : null;
  const gateShortName = currentGate ? currentGate.name.split('/')[0].split('(')[0].trim() : 'Choose Gate';
  const signInUrl = `/signin?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2">
        {/* Left: Brand + Persistent "Deliver to: gate" Picker with Desktop Popover */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 lg:flex-initial">
          <Link
            to="/"
            className="flex items-center gap-1.5 sm:gap-2 group rounded-xl shrink-0 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
          >
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-[#830020] text-[#FFB400] shadow-xs transition-transform group-hover:scale-105 shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 14C4 9.58 7.58 6 12 6C16.42 6 20 9.58 20 14H4Z" fill="#FFB400" />
                <path d="M3 16.5H21C21 18.7 19.2 20.5 17 20.5H7C4.8 20.5 3 18.7 3 16.5Z" fill="#FFFFFF" />
                <circle cx="12" cy="4" r="1.5" fill="#FFB400" />
              </svg>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-base sm:text-lg font-extrabold tracking-tight text-[#830020] dark:text-[#FFB400]">
                TreFood
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-[var(--color-text-muted)]">
                NIT Patna
              </span>
            </div>
          </Link>

          {/* Persistent "Deliver to: gate" button + anchored popover on desktop */}
          <div className="relative flex-1 min-w-0 max-w-[175px] sm:max-w-[240px]">
            <button
              type="button"
              onClick={() => onToggleGatePicker(!gatePickerOpen)}
              aria-expanded={gatePickerOpen}
              aria-haspopup="dialog"
              className="flex w-full min-h-[44px] min-w-0 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 sm:px-3 py-1 text-left text-xs transition-colors hover:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] sm:text-xs font-bold text-[var(--color-text)] leading-tight">
                  <span className="sr-only sm:not-sr-only sm:font-medium sm:text-[var(--color-text-muted)]">Deliver to: </span>
                  <span>{gateShortName}</span>
                </div>
                <div
                  className={`flex items-center gap-1 truncate text-[10px] font-semibold leading-tight ${
                    gateStatus && !gateStatus.isOpen
                      ? 'text-red-700 dark:text-red-400'
                      : gateStatus?.isNearingCurfew
                      ? 'text-amber-800 dark:text-[#FFB400]'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  <Clock className="h-2.5 w-2.5 shrink-0 hidden sm:inline" aria-hidden="true" />
                  <span className="truncate">
                    {gateStatus ? gateStatus.statusText : 'Checking gate'}
                    {gateStatus?.countdownText && !gateStatus.is24x7 ? ` • ${gateStatus.countdownText}` : ''}
                  </span>
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
            </button>

            {gatePickerOpen && (
              <Suspense fallback={null}>
                <GatePicker
                  open={gatePickerOpen}
                  onClose={() => onToggleGatePicker(false)}
                  gates={gates}
                  currentGateId={selectedGateId}
                  onSelectGate={(gateOrId) =>
                    onSelectGate(typeof gateOrId === 'string' ? gateOrId : gateOrId.id)
                  }
                  variant="popover"
                />
              </Suspense>
            )}
          </div>
        </div>

        {/* Sticky Landing Navigation Links (Desktop >= 1024px) */}
        {showDesktopLinks && (
          <nav aria-label="Landing navigation" className="hidden lg:flex items-center gap-0.5">
            {LANDING_ANCHORS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-xl px-2.5 xl:px-3 text-xs xl:text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/app"
              className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-xl px-2.5 xl:px-3 text-xs xl:text-sm font-bold text-[#830020] dark:text-[#FFB400] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              Browse menus
            </Link>
          </nav>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {showDesktopLinks && onInstallApp && (
            <button
              type="button"
              onClick={onInstallApp}
              className="hidden sm:inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              <Download className="h-3.5 w-3.5 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
              <span>Install App</span>
            </button>
          )}

          <ThemeToggle />

          {!showDesktopLinks && (
            <>
              {onOpenNotifications && (
                <button
                  type="button"
                  onClick={onOpenNotifications}
                  aria-label="Open order notifications"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
                >
                  <Bell className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
                </button>
              )}
              <Link
                to="/favorites"
                aria-label="Saved Favourites"
                className="hidden sm:inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
              >
                <Heart className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
              </Link>
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
            </>
          )}

          {showDesktopLinks ? (
            <>
              {user ? (
                <Link
                  to="/account"
                  className="hidden sm:inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#830020] px-3 text-xs font-bold text-white shadow-xs hover:bg-[#6a001a] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
                >
                  <UserCheck className="h-4 w-4 text-[#FFB400]" aria-hidden="true" />
                  <span className="max-w-[76px] truncate">{user.name?.split(' ')[0] || 'Account'}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(signInUrl)}
                  className="hidden sm:inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#830020] px-3 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#6a001a] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
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

      {/* Collapsible Mobile Menu Drawer for Landing Page */}
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
            to="/app"
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
          <Link
            to={user ? '/account' : signInUrl}
            onClick={() => setMobileMenuOpen(false)}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[#830020] px-3 text-sm font-bold text-white"
          >
            <LogIn className="h-4 w-4 text-[#FFB400]" aria-hidden="true" />
            <span>{user ? `Signed in (${user.name})` : 'Sign in'}</span>
          </Link>
        </nav>
      )}
    </header>
  );
}
