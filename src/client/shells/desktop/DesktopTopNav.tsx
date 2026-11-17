import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingBag, Receipt, Heart, User } from 'lucide-react';
import { DesktopGateStatus } from '../../components/v2/GateStatus/DesktopGateStatus';
import { DesktopCommandSearch } from '../../components/desktop/DesktopCommandSearch';
import { useTranslation } from '../../i18n';
import type { Gate } from '@shared/schemas';

export interface DesktopTopNavProps {
  selectedGateId: string;
  gates: Gate[];
  onSelectGate: (id: string) => void;
  cartItemCount: number;
  cartTotalPaise: number;
  onOpenCart: () => void;
  className?: string;
}

export function DesktopTopNav({
  selectedGateId,
  gates,
  onSelectGate,
  cartItemCount,
  cartTotalPaise,
  onOpenCart,
  className = '',
}: DesktopTopNavProps) {
  const { t } = useTranslation();
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);

  // Global shortcut: Cmd+K / Ctrl+K opens search overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOverlayOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const rupeeTotal = `₹${Math.round(cartTotalPaise / 100)}`;

  return (
    <>
      <header
        className={`sticky top-0 z-40 h-[72px] border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md transition-shadow ${className}`}
      >
        <div className="tf-desktop-container h-full flex items-center justify-between gap-6">
          {/* Left: Wordmark & Compact Gate Selector */}
          <div className="flex items-center gap-6 shrink-0">
            <Link
              to="/app"
              aria-label="TreFood NIT Patna Home"
              className="flex items-center gap-3 rounded-[12px] p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
            >
              <img
                src="/images/brand/trefood-brand-logo.jpg"
                alt=""
                width={38}
                height={38}
                className="h-[38px] w-[38px] rounded-[10px] object-cover border border-[var(--color-border)] shadow-xs"
              />
              <div className="leading-tight">
                <span className="font-display text-[22px] font-black tracking-tight text-[#830020] dark:text-[#FFB400]">
                  TreFood
                </span>
                <span className="block text-[13px] font-semibold text-[var(--color-text-muted)]">
                  NIT Patna
                </span>
              </div>
            </Link>

            {/* Gate Selector */}
            <DesktopGateStatus
              selectedGateId={selectedGateId}
              gates={gates}
              onSelectGate={onSelectGate}
            />
          </div>

          {/* Center: Command-Style Search Trigger Button */}
          <div className="flex-1 max-w-lg mx-2">
            <button
              type="button"
              aria-label="Search dishes or kitchens"
              onClick={() => setSearchOverlayOpen(true)}
              className="w-full h-11 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 flex items-center justify-between text-[14px] text-[var(--color-text-muted)] hover:border-[#830020] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
                <span className="font-medium">Search dishes, canteens, biryani...</span>
              </span>
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[13px] font-mono font-medium text-[var(--color-text-muted)]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Slim Nav (Orders, Favourites, Cart, Account) */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/orders"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[14px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] hover:text-[#830020] dark:hover:text-[#FFB400] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
            >
              <Receipt className="h-4 w-4 text-[var(--color-text-muted)]" />
              <span>{t('nav.orders', 'Orders')}</span>
            </Link>

            <Link
              to="/favorites"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[14px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] hover:text-[#830020] dark:hover:text-[#FFB400] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
            >
              <Heart className="h-4 w-4 text-[var(--color-text-muted)]" />
              <span>{t('nav.favorites', 'Favourites')}</span>
            </Link>

            {/* Cart Button with Count */}
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`Cart with ${cartItemCount} items, total ${rupeeTotal}`}
              className={`flex h-11 items-center gap-2.5 rounded-full border px-4 py-2 font-bold transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] ${
                cartItemCount > 0
                  ? 'border-[#830020] bg-[#830020] text-white shadow-[var(--elevation-2)] hover:bg-[#680019] dark:border-[#FFB400] dark:bg-[#FFB400] dark:text-[#1C1210]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[#830020] hover:bg-[var(--color-surface-sunken)]'
              }`}
            >
              <ShoppingBag className="h-4 w-4 shrink-0" />
              <span className="text-[14px]">
                {cartItemCount > 0 ? `Cart (${cartItemCount})` : 'Cart'}
              </span>
              {cartItemCount > 0 && (
                <>
                  <span className="opacity-60">•</span>
                  <span className="text-[14px] font-extrabold">{rupeeTotal}</span>
                </>
              )}
            </button>

            {/* Account */}
            <Link
              to="/account"
              aria-label="Account Settings"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] hover:border-[#830020] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
            >
              <User className="h-4 w-4 text-[var(--color-text)]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Command Search Overlay Modal */}
      <DesktopCommandSearch
        open={searchOverlayOpen}
        onClose={() => setSearchOverlayOpen(false)}
        selectedGateId={selectedGateId}
      />
    </>
  );
}

export default DesktopTopNav;
