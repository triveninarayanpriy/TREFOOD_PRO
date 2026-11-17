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
      className={`group relative flex items-start gap-3 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--elevation-1)] active:scale-[0.99] transition-all duration-150 cursor-pointer ${className}`}
    >
      <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-[12px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)]">
        <ResponsiveImage
          src={vendor.coverImageUrl || `/images/vendors/${vendor.slug}.jpg`}
          alt={vendor.name}
          crop="4x3"
          width={160}
          height={120}
          className="h-full w-full object-cover tf-photo-warm"
        />
        {vendor.nightSafe && (
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-full bg-[#830020] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
            <ShieldCheck className="h-2.5 w-2.5" />
            <span>Night Safe</span>
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline justify-between gap-1.5">
          <h3 className="font-display text-[17px] font-bold text-[var(--color-text)] leading-snug truncate">
            {vendor.name}
          </h3>
          {vendor.ratingAvg > 0 && (
            <div className="flex items-center gap-0.5 shrink-0 text-[13px] font-bold text-[#78350F] dark:text-[#FFB400]">
              <Star className="h-3 w-3 fill-[#FFB400] text-[#FFB400]" />
              <span>{vendor.ratingAvg.toFixed(1)}</span>
            </div>
          )}
        </div>

        <p className="text-[13px] text-[var(--color-text-muted)] truncate capitalize">
          {vendor.tagline || vendor.category.replace('_', ' ')}
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[13px]">
          <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-text)]">
            <Clock className="h-3 w-3 text-[var(--color-text-muted)]" />
            <span>{etaMinutes}m gate drop</span>
          </span>
          <span className="text-[var(--color-border)]">•</span>
          <span className="text-[var(--color-text-muted)]">
            {rupeeMin > 0 ? `Min ₹${rupeeMin}` : 'No min'}
          </span>
        </div>

        {isClosingSoon && (
          <div className="pt-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-2.5 w-2.5 text-amber-700" />
              <span>Curfew in 15m</span>
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
