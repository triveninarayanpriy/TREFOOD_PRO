import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag } from 'lucide-react';
import { DesktopGateStatus } from '../../components/v2/GateStatus/DesktopGateStatus';
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
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/app/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const rupeeTotal = `₹${Math.round(cartTotalPaise / 100)}`;

  return (
    <header className={`sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md ${className}`}>
      <div className="tf-desktop-container flex h-20 items-center justify-between gap-6">
        {/* Left: Brand Logo & Campus Gate Selector */}
        <div className="flex items-center gap-6 shrink-0">
          <Link
            to="/"
            className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-[#FFB400] rounded-[12px] p-1"
          >
            <img
              src="/images/brand/trefood-brand-logo.jpg"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-[10px] object-cover border border-[var(--color-border)] shadow-xs"
            />
            <div className="leading-tight">
              <span className="font-display text-[22px] font-black tracking-tight text-[#830020] dark:text-[#FFB400]">
                TreFood
              </span>
              <span className="block text-[12px] font-medium text-[var(--color-text-muted)]">
                NIT Patna
              </span>
            </div>
          </Link>

          <DesktopGateStatus
            selectedGateId={selectedGateId}
            gates={gates}
            onSelectGate={onSelectGate}
          />
        </div>

        {/* Centre: Generous Search Bar */}
        <div className="flex-1 max-w-xl mx-4">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, drinks, biryani, burgers or canteens..."
              className="w-full min-h-[48px] rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] pl-12 pr-4 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[#830020] focus:bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[#FFB400] transition-colors"
            />
          </form>
        </div>

        {/* Right: Minimal Cart Pill (item count + subtotal) — No dev links, no extra icon clutter */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Cart with ${cartItemCount} items, total ${rupeeTotal}`}
            className={`flex min-h-[48px] items-center gap-3 rounded-full border px-5 py-2 font-bold transition-all duration-150 cursor-pointer ${
              cartItemCount > 0
                ? 'border-[#830020] bg-[#830020] text-white shadow-[var(--elevation-2)] hover:bg-[#69001A] dark:border-[#FFB400] dark:bg-[#FFB400] dark:text-[#1C1210]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[#830020] hover:bg-[var(--color-surface-sunken)]'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="text-[14px]">
              {cartItemCount > 0 ? `${cartItemCount} items` : 'Packet'}
            </span>
            {cartItemCount > 0 && (
              <>
                <span className="opacity-60">•</span>
                <span className="text-[15px] font-extrabold">{rupeeTotal}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
