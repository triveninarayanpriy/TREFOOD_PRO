import { Clock, Star, ChevronRight, Bell, Heart } from 'lucide-react';
import { Badge } from './Badge';
import type { VendorSummary } from '@shared/types';
import { isNightSafetyActive } from '@shared/curfew';

export function getVendorImageUrl(category: string): string {
  switch (category) {
    case 'meals':
      return '/images/meals.svg';
    case 'snacks':
      return '/images/snacks.svg';
    case 'fruits':
      return '/images/fruits.svg';
    case 'groceries':
      return '/images/groceries.svg';
    case 'vegetables':
      return '/images/vegetables.svg';
    case 'raw_chicken':
      return '/images/raw-chicken.svg';
    case 'late_night':
      return '/images/late-night.svg';
    case 'beverages':
      return '/images/beverages.svg';
    default:
      return '/images/meals.svg';
  }
}

export interface VendorCardProps {
  vendor: VendorSummary;
  onClick?: () => void;
  variant?: 'open' | 'closed';
  onNotify?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function VendorCard({
  vendor,
  onClick,
  variant,
  onNotify,
  isFavorite = false,
  onToggleFavorite,
}: VendorCardProps) {
  const isBusy = Boolean(vendor.busyUntil && vendor.busyUntil > Math.floor(Date.now() / 1000));
  const resolvedVariant =
    variant ?? (vendor.isOpen && vendor.canDeliverToGate !== false ? 'open' : 'closed');
  const nightSafe = vendor.nightSafe !== false;
  const nightNow = isNightSafetyActive();

  let opensAtLabel = '10:00';
  if (vendor.hoursJson) {
    try {
      const parsed = JSON.parse(vendor.hoursJson) as { open?: string };
      if (parsed.open) opensAtLabel = parsed.open;
    } catch {
      // ignore invalid json
    }
  }

  // Compact horizontal card for closed vendors
  if (resolvedVariant === 'closed') {
    return (
      <article
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-[var(--shadow-card)]"
        data-vendor-variant="closed"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img
            src={getVendorImageUrl(vendor.category)}
            alt={vendor.name}
            width={48}
            height={48}
            loading="lazy"
            className="h-12 w-12 rounded-xl object-cover grayscale opacity-75 shrink-0 bg-[var(--color-surface-sunken)]"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--color-text)] truncate">{vendor.name}</h3>
              <Badge variant="closed">Closed</Badge>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
              {vendor.deliveryReason === 'too_late'
                ? vendor.deliveryMessage || 'Gate curfew window closes before arrival'
                : `Opens at ${opensAtLabel} IST`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={isFavorite ? `Remove ${vendor.name} from favourites` : `Save ${vendor.name} to favourites`}
              aria-pressed={isFavorite}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] hover:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
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
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 text-xs font-semibold text-[var(--color-text)] hover:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Notify me</span>
            </button>
          )}
          {onClick && (
            <button
              type="button"
              onClick={onClick}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-3 text-xs font-semibold text-[#830020] hover:bg-[#830020]/10 dark:text-[#FFB400] dark:hover:bg-[#FFB400]/10 focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              <span>View menu</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <article
      data-vendor-variant="open"
      className="relative flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] transition-all hover:border-[#830020] hover:shadow-[var(--shadow-raised)]"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onClick}
            className="flex flex-1 min-w-0 items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-[#FFB400] rounded-xl"
          >
            <img
              src={getVendorImageUrl(vendor.category)}
              alt=""
              width={56}
              height={56}
              loading="lazy"
              className="h-14 w-14 rounded-xl object-cover shrink-0 border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)]"
            />
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[var(--color-text)] leading-snug truncate">
                {vendor.name}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs font-medium text-[var(--color-text-muted)] capitalize">
                  {vendor.category.replace('_', ' ')}
                </span>
                {vendor.ratingAvg > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-[#78350F] dark:text-[#FFB400]">
                    <Star className="h-3 w-3 fill-[#FFB400] text-[#FFB400]" aria-hidden="true" />
                    <span>{vendor.ratingAvg.toFixed(1)}</span>
                  </span>
                )}
              </div>
            </div>
          </button>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={onToggleFavorite}
                  aria-label={isFavorite ? `Remove ${vendor.name} from favourites` : `Save ${vendor.name} to favourites`}
                  aria-pressed={isFavorite}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] hover:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
                >
                  <Heart
                    className={`h-4 w-4 ${isFavorite ? 'fill-[#830020] text-[#830020] dark:fill-[#FFB400] dark:text-[#FFB400]' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              )}
              {isBusy ? (
                <Badge variant="warning">Busy</Badge>
              ) : (
                <Badge variant="success">Open</Badge>
              )}
            </div>
            {nightSafe && nightNow && <Badge variant="night_safe">Night Safe</Badge>}
          </div>
        </div>

        {vendor.description && (
          <p className="mt-2.5 text-xs text-[var(--color-text-muted)] line-clamp-2">
            {vendor.description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onClick}
        className="mt-3 flex min-h-[44px] w-full items-center justify-between border-t border-[var(--color-border-subtle)] pt-3 text-xs text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#FFB400] rounded-b-xl"
      >
        <div className="flex items-center gap-1.5 font-medium">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>~{vendor.etaMinutes ?? vendor.prepMinutes + 10} min to gate</span>
        </div>
        <div className="flex items-center gap-1 text-[#830020] dark:text-[#FFB400] font-bold">
          <span>View Menu</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </div>
      </button>
    </article>
  );
}
