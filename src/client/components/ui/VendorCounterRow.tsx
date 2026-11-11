import { Clock, ShieldCheck, Star, Heart, Bell, BellRing, CalendarClock, Utensils } from 'lucide-react';
import type { VendorSummary } from '@shared/types';

export interface VendorCounterRowProps {
  vendor: VendorSummary;
  onClick?: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  isNotified?: boolean;
  onNotify?: () => void;
  onPreOrder?: () => void;
  className?: string;
}

function getFallbackCover(vendor: VendorSummary): string {
  if (vendor.coverImageUrl) return vendor.coverImageUrl;
  return `/images/vendors/${vendor.slug}.jpg`;
}

function formatOpenLabel(hoursJson?: string): string {
  if (!hoursJson) return '10:00 AM';
  try {
    const parsed = JSON.parse(hoursJson) as { open?: string };
    if (!parsed.open) return '10:00 AM';
    const [hStr, mStr] = parsed.open.split(':');
    const h = Number(hStr);
    const m = mStr || '00';
    if (Number.isNaN(h)) return parsed.open;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${suffix}`;
  } catch {
    return '10:00 AM';
  }
}

/**
 * Signature Component #2: VendorCounterRow
 * Dense printed-menu vendor row: 4:3 real photograph on the left, structured campus counter
 * typography (name, tagline, cuisines, ETA, rating, min order, Night Safe) on the right.
 * Closed vendors collapse cleanly to a single slim line with opening time and Pre-order/Notify.
 */
export function VendorCounterRow({
  vendor,
  onClick,
  onToggleFavorite,
  isFavorite = false,
  isNotified = false,
  onNotify,
  onPreOrder,
  className = '',
}: VendorCounterRowProps) {
  const isAvailableNow = Boolean(vendor.isOpen) && vendor.canDeliverToGate !== false;
  const opensAt = formatOpenLabel(vendor.hoursJson);

  // Slim one-line closed row (no dimmed poster photo)
  if (!isAvailableNow) {
    return (
      <article
        data-vendor-variant="closed"
        data-vendor-slug={vendor.slug}
        className={`flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 last:border-b-0 ${className}`}
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClick}
              className="text-left font-display text-base font-bold text-[var(--color-text)] hover:text-[#830020] dark:hover:text-[#FFB400] truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] rounded"
            >
              {vendor.name}
            </button>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
              Closed · Opens at {opensAt} IST
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] truncate">
            {vendor.cuisines && vendor.cuisines.length > 0
              ? vendor.cuisines.slice(0, 4).join(' · ')
              : vendor.description}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={isFavorite ? `Remove ${vendor.name} from saved` : `Save ${vendor.name}`}
              aria-pressed={isFavorite}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] hover:border-[#830020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
            >
              <Heart
                className={`h-4 w-4 ${isFavorite ? 'fill-[#830020] text-[#830020] dark:fill-[#FFB400] dark:text-[#FFB400]' : ''}`}
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </button>
          )}
          {onNotify && (
            <button
              type="button"
              onClick={onNotify}
              aria-pressed={isNotified}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 text-xs font-semibold text-[var(--color-text)] hover:border-[#830020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
            >
              {isNotified ? (
                <BellRing className="h-3.5 w-3.5 text-[#15803D]" strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Bell className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              )}
              <span>{isNotified ? 'Notified' : 'Notify me'}</span>
            </button>
          )}
          {onPreOrder && (
            <button
              type="button"
              onClick={onPreOrder}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#830020] px-3.5 text-xs font-semibold text-white hover:bg-[#69001A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
            >
              <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              <span>Pre-order</span>
            </button>
          )}
        </div>
      </article>
    );
  }

  const etaMin = vendor.etaMinutes ?? vendor.prepMinutes + 8;
  const etaMax = vendor.prepMaxMinutes ? vendor.prepMaxMinutes + 8 : etaMin + 10;
  const minRupees = Math.round((vendor.minOrderPaise ?? 0) / 100);
  const cuisinesText =
    vendor.cuisines && vendor.cuisines.length > 0
      ? vendor.cuisines.slice(0, 4).join(' · ')
      : vendor.description;

  return (
    <article
      data-vendor-variant="open"
      data-vendor-slug={vendor.slug}
      className={`group flex flex-col sm:flex-row items-stretch gap-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl p-3 sm:p-4 shadow-[var(--shadow-card)] transition-colors hover:border-[#830020] dark:hover:border-[#FFB400] ${className}`}
    >
      {/* Left: Consistent 4:3 Real Photograph */}
      <button
        type="button"
        onClick={onClick}
        className="relative aspect-[4/3] w-full sm:w-44 md:w-48 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
      >
        <img
          src={getFallbackCover(vendor)}
          alt={vendor.name}
          width={320}
          height={240}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover tf-photo-warm transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {vendor.tagline && (
          <span className="absolute bottom-2 left-2 rounded-md bg-[#1C1210]/85 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#FBF6EE]">
            {vendor.tagline}
          </span>
        )}
      </button>

      {/* Right: Printed Counter Metadata */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <button
              type="button"
              onClick={onClick}
              className="text-left font-display text-lg font-bold leading-snug text-[var(--color-text)] hover:text-[#830020] dark:hover:text-[#FFB400] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] rounded"
            >
              {vendor.name}
            </button>
            <p className="text-xs text-[var(--color-text-muted)] line-clamp-1">{cuisinesText}</p>
          </div>

          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={isFavorite ? `Remove ${vendor.name} from saved` : `Save ${vendor.name}`}
              aria-pressed={isFavorite}
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] hover:border-[#830020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
            >
              <Heart
                className={`h-4 w-4 ${isFavorite ? 'fill-[#830020] text-[#830020] dark:fill-[#FFB400] dark:text-[#FFB400]' : ''}`}
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </button>
          )}
        </div>

        {/* Hairline Key Metadata Row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-dotted border-[var(--color-border)] pt-2 text-xs text-[var(--color-text)]">
          <span className="inline-flex items-center gap-1 font-mono font-bold">
            <Star className="h-3.5 w-3.5 fill-[#FFB400] text-[#FFB400]" strokeWidth={1.75} aria-hidden="true" />
            <span>{vendor.ratingAvg.toFixed(1)}</span>
            <span className="font-normal text-[var(--color-text-muted)]">({vendor.ratingCount})</span>
          </span>

          <span className="text-[var(--color-border)]" aria-hidden="true">|</span>

          <span className="inline-flex items-center gap-1 font-mono text-[var(--color-text-muted)]">
            <Clock className="h-3.5 w-3.5 text-[#830020] dark:text-[#FFB400]" strokeWidth={1.75} aria-hidden="true" />
            <span>{etaMin}-{etaMax} min</span>
          </span>

          <span className="text-[var(--color-border)]" aria-hidden="true">|</span>

          <span className="font-mono font-semibold text-[var(--color-text)]">
            {minRupees > 0 ? `Min ₹${minRupees}` : 'No min order'}
          </span>

          <span className="text-[var(--color-border)]" aria-hidden="true">|</span>

          <span className="font-semibold text-[#15803D] dark:text-[#4ADE80]">₹0 Delivery</span>

          {vendor.dineInAvailable && (
            <>
              <span className="text-[var(--color-border)]" aria-hidden="true">|</span>
              <span className="inline-flex items-center gap-1 text-[var(--color-text-muted)]">
                <Utensils className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                Dine-in
              </span>
            </>
          )}
        </div>

        {/* Footer: Night Safety + Primary Open Menu Link */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          {vendor.nightSafe !== false ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#824410] dark:text-[#E5A365]">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              Night Safe: Owner/staff gate handoff after 7 PM
            </span>
          ) : (
            <span />
          )}

          {onClick && (
            <button
              type="button"
              onClick={onClick}
              className="inline-flex min-h-[44px] items-center rounded-lg bg-[#FFB400] px-4 text-xs font-bold text-[#1C1210] hover:bg-[#E5A100] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#830020]"
            >
              Open Menu
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
