import { Star, Clock, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';
import { ResponsiveImage } from '../../ui/ResponsiveImage';
import type { VendorSummary } from '@shared/types';

export interface SignatureDish {
  name: string;
  pricePaise: number;
}

export interface DesktopVendorCardProps {
  vendor: VendorSummary;
  signatureDishes?: SignatureDish[];
  onClick?: () => void;
  className?: string;
}

export function DesktopVendorCard({
  vendor,
  signatureDishes,
  onClick,
  className = '',
}: DesktopVendorCardProps) {
  const isClosingSoon = vendor.deliveryReason === 'closing_soon';
  const etaMinutes = vendor.etaMinutes ?? vendor.prepMinutes + 10;
  const rupeeMin = Math.round((vendor.minOrderPaise ?? 0) / 100);

  // Fallback signature items if not explicitly provided
  const dishes = signatureDishes || [
    { name: 'Special Campus Meal', pricePaise: (vendor.minOrderPaise || 9900) },
    { name: 'Hot Chai & Snack Pack', pricePaise: 4900 },
  ];

  return (
    <article
      data-vendor-slug={vendor.slug}
      onClick={onClick}
      className={`group flex flex-col justify-between overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--elevation-1)] hover:shadow-[var(--elevation-3)] hover:border-[#830020] hover:-translate-y-1 transition-all duration-200 cursor-pointer ${className}`}
    >
      <div className="space-y-4">
        {/* Large 4:3 Editorial Photograph with View Transition Support */}
        <div
          className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-subtle)]"
          style={{ viewTransitionName: `vendor-cover-${vendor.slug}` }}
        >
          <ResponsiveImage
            src={vendor.coverImageUrl || `/images/vendors/${vendor.slug}.jpg`}
            alt={vendor.name}
            crop="4x3"
            width={480}
            height={360}
            className="h-full w-full object-cover tf-photo-warm transition-transform duration-300 group-hover:scale-[1.03]"
          />

          {/* Curfew Status Badge — ONLY if closing soon */}
          {isClosingSoon && (
            <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500 text-stone-950 px-3 py-1 text-[13px] font-bold shadow-md">
              <AlertTriangle className="h-3.5 w-3.5 text-stone-950" />
              <span>Closing in 15m</span>
            </div>
          )}

          {vendor.nightSafe && (
            <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-[#1C1210]/90 text-white px-2.5 py-1 text-[13px] font-semibold tracking-wide">
              <ShieldCheck className="h-3.5 w-3.5 text-[#FFB400]" />
              <span>Campus Night Safe</span>
            </div>
          )}
        </div>

        {/* Generous Whitespace & Editorial Typography */}
        <div className="px-6 space-y-3">
          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-[22px] font-bold text-[var(--color-text)] leading-snug group-hover:text-[#830020] dark:group-hover:text-[#FFB400] transition-colors">
                {vendor.name}
              </h3>
              {vendor.ratingAvg > 0 && (
                <div className="flex items-center gap-1 shrink-0 text-[14px] font-bold text-[#78350F] dark:text-[#FFB400]">
                  <Star className="h-3.5 w-3.5 fill-[#FFB400] text-[#FFB400]" />
                  <span>{vendor.ratingAvg.toFixed(1)}</span>
                </div>
              )}
            </div>

            <p className="text-[14px] text-[var(--color-text-muted)] line-clamp-1">
              {vendor.tagline || vendor.cuisines?.slice(0, 3).join(' · ') || vendor.category.replace('_', ' ')}
            </p>
          </div>

          {/* Gate Delivery Details */}
          <div className="flex items-center gap-3 pt-1 text-[14px]">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-text)]">
              <Clock className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
              <span>{etaMinutes} mins to gate</span>
            </span>
            <span className="text-[var(--color-border)]">•</span>
            <span className="text-[var(--color-text-muted)]">
              {rupeeMin > 0 ? `Min ₹${rupeeMin}` : 'Zero min order'}
            </span>
          </div>

          {/* 2-3 Signature Dishes with Prices */}
          <div className="pt-2 border-t border-[var(--color-border-subtle)] space-y-1.5">
            <div className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Popular at this counter
            </div>
            {dishes.slice(0, 3).map((dish) => (
              <div
                key={dish.name}
                className="flex items-baseline justify-between text-[14px] text-[var(--color-text)] py-0.5"
              >
                <span className="truncate pr-2 font-medium">{dish.name}</span>
                <span className="shrink-0 font-bold text-[var(--color-text-muted)]">
                  ₹{Math.round(dish.pricePaise / 100)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 pt-4 flex items-center justify-between text-[#830020] dark:text-[#FFB400] text-[14px] font-bold">
        <span>View Full Menu</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </article>
  );
}
