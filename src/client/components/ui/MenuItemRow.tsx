import { Badge } from './Badge';
import { QuantityStepper } from './QuantityStepper';
import { getVendorImageUrl } from './VendorCard';
import { SlidersHorizontal } from 'lucide-react';

export interface MenuItemRowProps {
  id?: string;
  name: string;
  nameHi?: string | null;
  description?: string;
  pricePaise: number;
  isVeg: boolean;
  inStock: boolean;
  category?: string;
  imageUrl?: string | null;
  quantity?: number;
  hasCustomisation?: boolean;
  onOpenOptions?: () => void;
  onAdd?: () => void;
  onIncrease?: () => void;
  onDecrease?: () => void;
  notes?: string;
  onAddNote?: () => void;
}

export function MenuItemRow({
  name,
  nameHi,
  description,
  pricePaise,
  isVeg,
  inStock,
  category = 'meals',
  imageUrl,
  quantity = 0,
  hasCustomisation = false,
  onOpenOptions,
  onAdd,
  onIncrease,
  onDecrease,
  notes,
  onAddNote,
}: MenuItemRowProps) {
  const imgSrc = imageUrl || getVendorImageUrl(category);

  return (
    <div
      data-menu-item={name}
      className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3 sm:gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpenOptions}
          disabled={!onOpenOptions}
          aria-label={`View details and options for ${name}`}
          className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] disabled:cursor-default"
        >
          <img
            src={imgSrc}
            alt={name}
            width={64}
            height={64}
            loading="lazy"
            decoding="async"
            className={`h-16 w-16 rounded-xl object-cover shrink-0 border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] ${
              !inStock ? 'grayscale opacity-75' : ''
            }`}
          />
        </button>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isVeg ? 'veg' : 'nonveg'} />
            <h3 className="text-sm font-bold text-[var(--color-text)] leading-snug">
              {onOpenOptions ? (
                <button
                  type="button"
                  onClick={onOpenOptions}
                  className="text-left hover:text-[#830020] dark:hover:text-[#FFB400] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] rounded"
                >
                  {name}
                </button>
              ) : (
                name
              )}
            </h3>
            {nameHi && (
              <span className="text-xs text-[var(--color-text-muted)]">({nameHi})</span>
            )}
          </div>

          {description && (
            <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">{description}</p>
          )}

          <div className="pt-0.5 flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-sm font-extrabold text-[var(--color-text)]">
              ₹{(pricePaise / 100).toFixed(2)}
            </span>
            {!inStock && <Badge variant="closed">Out of stock</Badge>}
            {hasCustomisation && inStock && onOpenOptions && (
              <button
                type="button"
                onClick={onOpenOptions}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2 text-[11px] font-semibold text-[var(--color-text)] hover:border-[#830020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
              >
                <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
                <span>Customise</span>
              </button>
            )}
            {quantity > 0 && onAddNote && (
              <button
                type="button"
                onClick={onAddNote}
                className="min-h-[32px] text-xs font-semibold text-[#830020] underline hover:opacity-80 dark:text-[#FFB400] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] rounded"
              >
                {notes ? `Note: "${notes}"` : '+ Add note'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1.5 self-center">
        {!inStock ? (
          <Badge variant="closed">Unavailable</Badge>
        ) : (
          <QuantityStepper
            value={quantity}
            onIncrease={quantity === 0 ? onAdd || onIncrease : onIncrease}
            onDecrease={onDecrease}
          />
        )}
      </div>
    </div>
  );
}
