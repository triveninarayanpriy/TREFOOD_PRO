import { Plus, Minus } from 'lucide-react';
import { ResponsiveImage } from '../../ui/ResponsiveImage';

export interface MobileMenuItemProps {
  id?: string;
  name: string;
  description?: string | null;
  pricePaise: number;
  isVeg: boolean;
  inStock: boolean;
  imageUrl?: string | null;
  quantity?: number;
  onAdd?: () => void;
  onIncrease?: () => void;
  onDecrease?: () => void;
  onOpenOptions?: () => void;
}

export function MobileMenuItem({
  name,
  description,
  pricePaise,
  isVeg,
  inStock,
  imageUrl,
  quantity = 0,
  onAdd,
  onIncrease,
  onDecrease,
  onOpenOptions,
}: MobileMenuItemProps) {
  const rupeePrice = `₹${Math.round(pricePaise / 100)}`;

  return (
    <article
      data-menu-item={name}
      className="flex items-start justify-between gap-3 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-[var(--elevation-1)]"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5">
          <span
            role="img"
            aria-label={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
            className={`inline-block h-3 w-3 rounded-full border-2 ${
              isVeg ? 'border-emerald-600 bg-emerald-600' : 'border-red-600 bg-red-600'
            }`}
          />
          <h4 className="font-sans text-[16px] font-bold text-[var(--color-text)] leading-snug">
            {name}
          </h4>
        </div>

        <div className="font-sans text-[16px] font-extrabold text-[var(--color-text)]">
          {rupeePrice}
        </div>

        {description && (
          <p className="text-[13px] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 shrink-0">
        {imageUrl && (
          <div className="relative h-20 w-20 overflow-hidden rounded-[12px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)]">
            <ResponsiveImage
              src={imageUrl}
              alt={name}
              crop="1x1"
              width={80}
              height={80}
              className={`h-full w-full object-cover tf-photo-warm ${!inStock ? 'grayscale opacity-70' : ''}`}
            />
          </div>
        )}

        {inStock ? (
          quantity > 0 ? (
            <div className="flex items-center gap-2 rounded-full border border-[#830020] bg-[var(--color-surface)] px-2 py-1 shadow-xs">
              <button
                type="button"
                onClick={onDecrease}
                aria-label={`Decrease ${name}`}
                className="flex h-7 w-7 min-h-[44px] min-w-[44px] items-center justify-center text-[#830020] dark:text-[#FFB400] font-bold"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="font-bold text-[14px] min-w-[16px] text-center">{quantity}</span>
              <button
                type="button"
                onClick={onIncrease}
                aria-label={`Increase ${name}`}
                className="flex h-7 w-7 min-h-[44px] min-w-[44px] items-center justify-center text-[#830020] dark:text-[#FFB400] font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenOptions || onAdd}
              className="flex min-h-[44px] min-w-[76px] items-center justify-center rounded-full bg-[#830020] px-3 text-[13px] font-bold text-white shadow-xs active:scale-95 transition-transform"
            >
              Add +
            </button>
          )
        ) : (
          <span className="text-[13px] font-semibold text-[var(--color-text-muted)] py-2">
            Sold out
          </span>
        )}
      </div>
    </article>
  );
}
