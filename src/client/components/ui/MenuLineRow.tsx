import { Plus } from 'lucide-react';
import { QuantityStepper } from './QuantityStepper';

export interface MenuLineRowProps {
  name: string;
  description?: string | null;
  pricePaise: number;
  packingChargePaise?: number;
  isVeg: boolean;
  inStock: boolean;
  isPopular?: boolean;
  hasCustomisation?: boolean;
  imageUrl?: string | null;
  quantity?: number;
  notes?: string;
  onAddNote?: () => void;
  onOpenOptions?: () => void;
  onAdd?: () => void;
  onIncrease?: () => void;
  onDecrease?: () => void;
  className?: string;
}

/**
 * Signature Component #3: MenuLineRow
 * Printed menu line featuring square veg/non-veg FSSAI marker, optional 1:1 dish photo,
 * item name, dotted leader line, right-aligned tabular rupee price, and 44px action control.
 */
export function MenuLineRow({
  name,
  description,
  pricePaise,
  packingChargePaise = 0,
  isVeg,
  inStock,
  isPopular = false,
  hasCustomisation = false,
  imageUrl,
  quantity = 0,
  notes,
  onAddNote,
  onOpenOptions,
  onAdd,
  onIncrease,
  onDecrease,
  className = '',
}: MenuLineRowProps) {
  const rupeeLabel = `₹${Math.round(pricePaise / 100)}`;

  return (
    <div
      data-menu-item={name}
      className={`flex items-start gap-3 border-b border-[var(--color-border-subtle)] py-3.5 last:border-b-0 ${className}`}
    >
      {/* Optional 1:1 Square Dish Photo */}
      {imageUrl && (
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
          <img
            src={imageUrl}
            alt={name}
            width={64}
            height={64}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover tf-photo-warm ${!inStock ? 'grayscale opacity-70' : ''}`}
          />
        </div>
      )}

      {/* Middle Printed Menu Line with Dotted Leader */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline gap-2">
          {/* Square FSSAI Veg / Non-veg Mark */}
          <span
            role="img"
            aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
            title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
            className={`inline-flex h-3.5 w-3.5 shrink-0 translate-y-[1px] items-center justify-center rounded-[2px] border bg-[var(--color-surface)] ${
              isVeg ? 'border-[#15803D]' : 'border-[#B91C1C]'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isVeg ? 'bg-[#15803D]' : 'bg-[#B91C1C]'}`}
            />
          </span>

          <h4 className={`text-sm font-bold leading-snug ${!inStock ? 'text-[var(--color-text-muted)] line-through decoration-[var(--color-border)]' : 'text-[var(--color-text)]'}`}>{name}</h4>

          {/* Printed menu dotted leader */}
          <span
            aria-hidden="true"
            className="hidden sm:block flex-1 border-b border-dotted border-[var(--color-border)] mx-1"
          />

          {/* Right-aligned integer price */}
          <span className="ml-auto shrink-0 font-mono text-sm font-bold text-[var(--color-text)]">
            {rupeeLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--color-text-muted)]">
          {isPopular && (
            <span className="font-mono font-bold uppercase tracking-wider text-[#830020] dark:text-[#FFB400]">
              Popular
            </span>
          )}
          {packingChargePaise > 0 && (
            <span className="font-mono">+₹{Math.round(packingChargePaise / 100)} packing</span>
          )}
          {hasCustomisation && <span>Customisable</span>}
          {!inStock && (
            <span className="font-semibold text-[#B91C1C] dark:text-[#FCA5A5]">
              Out of stock today
            </span>
          )}
        </div>

        {description && (
          <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}

        {(notes || onAddNote) && quantity > 0 && (
          <div className="pt-0.5 flex flex-wrap items-center gap-2 text-[11px]">
            {notes && (
              <span className="rounded bg-[var(--color-surface-sunken)] px-2 py-0.5 text-[var(--color-text-muted)]">
                Note: {notes}
              </span>
            )}
            {onAddNote && (
              <button
                type="button"
                onClick={onAddNote}
                className="font-semibold text-[#830020] hover:underline dark:text-[#FFB400]"
              >
                {notes ? 'Edit note' : 'Add cooking note'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right Control: 44px Add / Customise / Stepper */}
      <div className="shrink-0 self-center">
        {!inStock ? (
          <span className="inline-flex min-h-[44px] items-center px-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
            Sold out
          </span>
        ) : quantity > 0 && onIncrease && onDecrease ? (
          <QuantityStepper
            value={quantity}
            onIncrease={onIncrease}
            onDecrease={onDecrease}
            itemName={name}
          />
        ) : hasCustomisation && onOpenOptions ? (
          <button
            type="button"
            onClick={onOpenOptions}
            className="inline-flex min-h-[44px] min-w-[84px] items-center justify-center rounded-lg border border-[#830020] bg-[var(--color-surface)] px-3 text-xs font-bold text-[#830020] hover:bg-[#830020] hover:text-white dark:border-[#FFB400] dark:text-[#FFB400] dark:hover:bg-[#FFB400] dark:hover:text-[#1C1210] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
          >
            Customise
          </button>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-[44px] min-w-[76px] items-center justify-center gap-1 rounded-lg border border-[#830020] bg-[var(--color-surface)] px-3 text-xs font-bold text-[#830020] hover:bg-[#830020] hover:text-white dark:border-[#FFB400] dark:text-[#FFB400] dark:hover:bg-[#FFB400] dark:hover:text-[#1C1210] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            <span>Add</span>
          </button>
        )}
      </div>
    </div>
  );
}
