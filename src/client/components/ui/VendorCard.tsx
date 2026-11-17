import { Clock, Star, ChevronRight, Bell, BellRing, CalendarClock, Heart, Tag } from 'lucide-react';
import { Badge } from './Badge';
import { ResponsiveImage } from './ResponsiveImage';
import type { VendorSummary } from '@shared/types';
import { isNightSafetyActive } from '@shared/curfew';

export function getVendorImageUrl(category: string): string {
  switch (category) {
    case 'meals':
    case 'snacks':
      return '/images/categories/food.jpg';
    case 'fruits':
    case 'vegetables':
      return '/images/categories/vegetables-real.jpg';
    case 'groceries':
      return '/images/categories/groceries-real.jpg';
    case 'raw_chicken':
      return '/images/categories/chicken-real.jpg';
    case 'beverages':
    case 'juices':
      return '/images/categories/juices.jpg';
    default:
      return '/images/categories/food.jpg';
  }
}

export interface VendorCardProps {
  vendor: VendorSummary;
  onClick?: () => void;
  variant?: 'open' | 'closed';
  onNotify?: () => void;
  isNotified?: boolean;
  onPreOrder?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function VendorCard({
  vendor,
  onClick,
  variant,
  onNotify,
  isNotified = false,
  onPreOrder,
  isFavorite = false,
  onToggleFavorite,
}: VendorCardProps) {
  const isBusy = Boolean(vendor.busyUntil && vendor.busyUntil > Math.floor(Date.now() / 1000));
  const resolvedVariant =
    variant ?? (vendor.isOpen && vendor.canDeliverToGate !== false ? 'open' : 'closed');
  const nightSafe = vendor.nightSafe !== false;
  const nightNow = isNightSafetyActive();

  let opensAtLabel = '09:00';
  if (vendor.hoursJson) {
    try {
      const parsed = JSON.parse(vendor.hoursJson) as { open?: string };
      if (parsed.open) opensAtLabel = parsed.open;
    } catch {
      // ignore invalid json
    }
  }

  const offerTags = vendor.offerTags && vendor.offerTags.length > 0
    ? vendor.offerTags
    : [(vendor.minOrderPaise ?? 0) === 0 ? 'Zero delivery • No min' : 'Zero delivery fee'];

  // Slim closed list row (no large dimmed photo)
  if (resolvedVariant === 'closed') {
    const statusReason =
      vendor.deliveryReason === 'too_late'
        ? vendor.deliveryMessage || `Curfew closes before delivery • Opens at ${opensAtLabel} IST`
        : `Opens at ${opensAtLabel} IST`;

    return (
      <article
        className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 shadow-[var(--shadow-card)]"
        data-vendor-variant="closed"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClick}
              className="text-left text-sm font-bold text-[var(--color-text)] hover:text-[#830020] dark:hover:text-[#FFB400] truncate max-w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] rounded"
            >
              {vendor.name}
            </button>
            <Badge variant="closed">Closed</Badge>
            {nightSafe && <Badge variant="night_safe">Night Safe</Badge>}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] truncate">
            {statusReason}
            {vendor.ratingAvg > 0 ? ` · Rated ${vendor.ratingAvg.toFixed(1)}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={isFavorite ? `Remove ${vendor.name} from favourites` : `Save ${vendor.name} to favourites`}
              aria-pressed={isFavorite}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] hover:border-[#830020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
            >
              <Heart
                className={`h-4 w-4 ${isFavorite ? 'fill-[#830020] text-[#830020] dark:fill-[#FFB400] dark:text-[#FFB400]' : ''}`}
                aria-hidden="true"
              />
            </button>
          )}
          {onNotify && (
            <button
              type="button"
              onClick={onNotify}
              aria-pressed={isNotified}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] ${
                isNotified
                  ? 'border-[#15803D] bg-[#DCFCE7] text-[#14532D] dark:border-[#16A34A] dark:bg-[#052E16] dark:text-[#BBF7D0]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-text)] hover:border-[#830020]'
              }`}
            >
              {isNotified ? (
                <BellRing className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Bell className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>{isNotified ? 'Notified' : 'Notify me'}</span>
            </button>
          )}
          {onPreOrder && (
            <button
              type="button"
              onClick={onPreOrder}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#830020] px-3 text-xs font-bold text-white shadow-xs hover:bg-[#6a001a] dark:bg-[#FFB400] dark:text-[#1C1917] dark:hover:bg-[#E5A200] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
            >
              <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Pre-order</span>
            </button>
          )}
          {!onPreOrder && onClick && (
            <button
              type="button"
              onClick={onClick}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-3 text-xs font-semibold text-[#830020] hover:bg-[#830020]/10 dark:text-[#FFB400] dark:hover:bg-[#FFB400]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
            >
              <span>View menu</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </article>
    );
  }

  const minOrderText =
    (vendor.minOrderPaise ?? 0) > 0
      ? `Min ₹${Math.round((vendor.minOrderPaise ?? 0) / 100)}`
      : 'No min order';
  const etaMinutes = vendor.etaMinutes ?? vendor.prepMinutes + 10;

  return (
    <article
      data-vendor-variant="open"
      className="relative flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] transition-all hover:border-[#830020] hover:shadow-[var(--shadow-raised)]"
    >
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onClick}
            className="flex flex-1 min-w-0 items-center gap-3 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
          >
            <ResponsiveImage
              src={vendor.coverImageUrl || getVendorImageUrl(vendor.category)}
              alt={vendor.name}
              crop="4x3"
              width={56}
              height={56}
              className="h-14 w-14 rounded-xl object-cover shrink-0 border border-[var(--color-border-subtle)] tf-photo-warm"
            />
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[var(--color-text)] leading-snug truncate">
                {vendor.name}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                <span className="font-medium text-[var(--color-text-muted)] capitalize">
                  {vendor.category.replace('_', ' ')}
                </span>
                {vendor.ratingAvg > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-[#FFFBEB] px-1.5 py-0.5 font-bold text-[#78350F] dark:bg-[#3B2406] dark:text-[#FDE68A]">
                    <Star className="h-3 w-3 fill-[#FFB400] text-[#FFB400]" aria-hidden="true" />
                    <span>{vendor.ratingAvg.toFixed(1)}</span>
                    {vendor.ratingCount > 0 && (
                      <span className="font-normal opacity-80">({vendor.ratingCount})</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={onToggleFavorite}
                aria-label={isFavorite ? `Remove ${vendor.name} from favourites` : `Save ${vendor.name} to favourites`}
                aria-pressed={isFavorite}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] hover:border-[#830020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
              >
                <Heart
                  className={`h-4 w-4 ${isFavorite ? 'fill-[#830020] text-[#830020] dark:fill-[#FFB400] dark:text-[#FFB400]' : ''}`}
                  aria-hidden="true"
                />
              </button>
            )}
            {isBusy ? <Badge variant="warning">Busy</Badge> : <Badge variant="success">Open</Badge>}
          </div>
        </div>

        {/* Night Safe Badge + Offer Tags + Min Order */}
        <div className="flex flex-wrap items-center gap-1.5">
          {nightSafe && (
            <Badge variant="night_safe">{nightNow ? 'Night Safe Now' : 'Night Safe'}</Badge>
          )}
          <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text)]">
            {minOrderText}
          </span>
          {offerTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-[#FCD34D] bg-[#FFFBEB] px-2 py-0.5 text-[11px] font-bold text-[#78350F] dark:border-[#92400E] dark:bg-[#331F04] dark:text-[#FDE68A]"
            >
              <Tag className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{tag}</span>
            </span>
          ))}
        </div>

        {vendor.description && (
          <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">
            {vendor.description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onClick}
        className="mt-3 flex min-h-[44px] w-full items-center justify-between border-t border-[var(--color-border-subtle)] pt-3 text-xs text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] rounded-b-xl"
      >
        <div className="flex items-center gap-2 font-medium">
          <span className="inline-flex items-center gap-1 text-[var(--color-text)] font-semibold">
            <Clock className="h-3.5 w-3.5 shrink-0 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
            <span>~{etaMinutes} min to gate</span>
          </span>
          {typeof vendor.startingPricePaise === 'number' && vendor.startingPricePaise > 0 && (
            <span className="text-[var(--color-text-muted)]">
              • From ₹{Math.round(vendor.startingPricePaise / 100)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[#830020] dark:text-[#FFB400] font-bold">
          <span>View Menu</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </div>
      </button>
    </article>
  );
}
