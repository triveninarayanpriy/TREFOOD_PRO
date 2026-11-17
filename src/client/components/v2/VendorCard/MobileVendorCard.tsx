import { Star, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ResponsiveImage } from '../../ui/ResponsiveImage';
import type { VendorSummary } from '@shared/types';

export interface MobileVendorCardProps {
  vendor: VendorSummary;
  onClick?: () => void;
  className?: string;
}

export function MobileVendorCard({ vendor, onClick, className = '' }: MobileVendorCardProps) {
  const isClosingSoon = vendor.deliveryReason === 'closing_soon';
  const etaMinutes = vendor.etaMinutes ?? vendor.prepMinutes + 10;
  const rupeeMin = Math.round((vendor.minOrderPaise ?? 0) / 100);

  return (
    <article
      data-vendor-slug={vendor.slug}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--elevation-1)] active:scale-[0.98] transition-all duration-150 cursor-pointer ${className}`}
    >
      {/* 16:10 Full-Width Vendor Cover Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-900">
        <ResponsiveImage
          src={vendor.coverImageUrl || `/images/vendors/${vendor.slug}.jpg`}
          alt={vendor.name}
          crop="4x3"
          width={640}
          height={400}
          className="h-full w-full object-cover tf-photo-warm group-hover:scale-[1.02] transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {vendor.nightSafe ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#830020] px-2.5 py-1 text-[12px] font-bold text-white shadow-sm backdrop-blur-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-white" />
              <span>Campus Night Safe</span>
            </span>
          ) : (
            <span />
          )}

          {vendor.ratingAvg > 0 && (
            <div className="inline-flex items-center gap-1 rounded-full bg-white/95 dark:bg-stone-900/90 px-2.5 py-1 text-[12px] font-extrabold text-stone-900 dark:text-stone-100 shadow-sm backdrop-blur-xs">
              <Star className="h-3 w-3 fill-[#FFB400] text-[#FFB400]" />
              <span>{vendor.ratingAvg.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Bottom Overlay on Image: Vendor Name & ETA */}
        <div className="absolute bottom-2.5 left-3 right-3 text-white">
          <h3 className="font-display text-[19px] font-bold text-white leading-tight truncate drop-shadow-sm">
            {vendor.name}
          </h3>
        </div>
      </div>

      {/* Card Content Area Below Photo */}
      <div className="p-3.5 space-y-1.5">
        <div className="flex items-center justify-between text-[13px] text-[var(--color-text-muted)]">
          <p className="truncate capitalize font-medium max-w-[200px]">
            {vendor.tagline || vendor.category.replace('_', ' ')}
          </p>
          <div className="flex items-center gap-1 text-[var(--color-text)] font-bold shrink-0">
            <Clock className="h-3.5 w-3.5 text-[#830020] dark:text-[#FFB400]" />
            <span>~{etaMinutes}m gate drop</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border-subtle)] text-[13px]">
          <span className="font-semibold text-[var(--color-text-muted)]">
            {rupeeMin > 0 ? `Min order ₹${rupeeMin}` : 'Zero min order'}
          </span>
          <span className="font-bold text-emerald-800 dark:text-emerald-400">
            Free Delivery
          </span>
        </div>

        {isClosingSoon && (
          <div className="pt-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-3 w-3 text-amber-700" />
              <span>Curfew in 15m • Order immediately</span>
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

export default MobileVendorCard;
