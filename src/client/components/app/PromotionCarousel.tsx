import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Tag, Check, Megaphone } from 'lucide-react';
import type { CouponSummary } from '@shared/types';
import { useCart } from '../../context/CartContext';
import { useToast } from '../ui/Toast';
import { Skeleton } from '../ui/Skeleton';

export interface PromotionCarouselProps {
  coupons: CouponSummary[];
  announcements?: Array<{ id: string; message: string }>;
  loading?: boolean;
}

export function PromotionCarousel({
  coupons,
  announcements = [],
  loading = false,
}: PromotionCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { couponCode, setCouponCode } = useCart();
  const { showToast } = useToast();

  const scrollTrack = (dir: -1 | 1) => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  const handleApplyCoupon = (code: string) => {
    setCouponCode(code);
    showToast(`Promo ${code} saved for your next packet!`, 'success');
  };

  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden" aria-label="Loading campus promotions">
        <Skeleton className="h-28 w-72 shrink-0 rounded-2xl" />
        <Skeleton className="h-28 w-72 shrink-0 rounded-2xl" />
        <Skeleton className="h-28 w-72 shrink-0 rounded-2xl" />
      </div>
    );
  }

  if (coupons.length === 0 && announcements.length === 0) {
    return null;
  }

  return (
    <section aria-label="Campus Promotions" className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
          <h2 className="text-sm font-bold text-[var(--color-text)]">Campus Offers & Promos</h2>
        </div>

        <div className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollTrack(-1)}
            aria-label="Scroll promotions left"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[#830020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scrollTrack(1)}
            aria-label="Scroll promotions right"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[#830020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 no-scrollbar"
      >
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className="snap-start flex w-[264px] sm:w-[296px] shrink-0 flex-col justify-between rounded-2xl border border-[#830020]/30 bg-[#FFF8E1] p-4 text-[#1C1917] shadow-[var(--shadow-card)] dark:border-[#FFB400]/30 dark:bg-[#2A1B08] dark:text-[#F5F5F4]"
          >
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#830020] dark:text-[#FFB400]">
              <Megaphone className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>NITP Campus Notice</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed line-clamp-3">{ann.message}</p>
          </div>
        ))}

        {coupons.map((cp) => {
          const isApplied = couponCode === cp.code;
          const discountHeadline =
            cp.discountType === 'percent'
              ? `${cp.discountValue}% OFF`
              : `₹${Math.round(cp.discountValue / 100)} OFF`;
          return (
            <div
              key={cp.id}
              className="snap-start flex w-[256px] sm:w-[280px] shrink-0 flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#830020] px-2.5 py-1 font-mono text-xs font-extrabold text-white dark:bg-[#FFB400] dark:text-[#1C1917]">
                    <Tag className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {cp.code}
                  </span>
                  <span className="text-xs font-extrabold text-[#15803D] dark:text-[#86EFAC]">
                    {discountHeadline}
                  </span>
                </div>
                <p className="text-xs font-medium text-[var(--color-text)] line-clamp-2">
                  {cp.description}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--color-border-subtle)] pt-2.5">
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  Min ₹{Math.round(cp.minOrderPaise / 100)}
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyCoupon(cp.code)}
                  className={`inline-flex min-h-[36px] items-center gap-1 rounded-xl px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] ${
                    isApplied
                      ? 'bg-[#DCFCE7] text-[#14532D] dark:bg-[#052E16] dark:text-[#BBF7D0]'
                      : 'bg-[var(--color-surface-sunken)] text-[#830020] hover:border-[#830020] border border-[var(--color-border)] dark:text-[#FFB400]'
                  }`}
                >
                  {isApplied && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span>{isApplied ? 'Applied' : 'Apply offer'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
