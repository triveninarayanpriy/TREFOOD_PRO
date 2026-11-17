import { Plus, Minus } from 'lucide-react';
import { ResponsiveImage } from '../../ui/ResponsiveImage';

export interface DesktopMenuItemProps {
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
  className?: string;
}

export function DesktopMenuItem({
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
  className = '',
}: DesktopMenuItemProps) {
  const rupeePrice = `₹${Math.round(pricePaise / 100)}`;

  return (
    <article
      data-menu-item={name}
      className={`group flex items-start justify-between gap-5 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--elevation-1)] hover:shadow-[var(--elevation-2)] hover:border-[#830020] transition-all duration-150 ${className}`}
    >
      {/* 1:1 Square Photo (at least 120x120) */}
      {imageUrl && (
        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-[16px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)]">
          <ResponsiveImage
            src={imageUrl}
            alt={name}
            crop="1x1"
            width={128}
            height={128}
            className={`h-full w-full object-cover tf-photo-warm transition-transform duration-300 group-hover:scale-[1.03] ${
              !inStock ? 'grayscale opacity-70' : ''
            }`}
          />
        </div>
      )}

      {/* Details & Typography */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full border-2 ${
              isVeg ? 'border-emerald-600 bg-emerald-600' : 'border-red-600 bg-red-600'
            }`}
            aria-label={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
          />
          <h4 className="font-sans text-[18px] font-bold text-[var(--color-text)] leading-snug group-hover:text-[#830020] dark:group-hover:text-[#FFB400] transition-colors">
            {name}
          </h4>
        </div>

        <div className="font-sans text-[20px] font-extrabold text-[var(--color-text)]">
          {rupeePrice}
        </div>

        {description && (
          <p className="text-[14px] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Add / Stepper Controls */}
      <div className="flex flex-col items-end justify-between self-stretch shrink-0">
        <div />
        {inStock ? (
          quantity > 0 ? (
            <div className="flex items-center gap-2.5 rounded-full border-2 border-[#830020] bg-[var(--color-surface)] px-3 py-1.5 shadow-xs">
              <button
                type="button"
                onClick={onDecrease}
                aria-label={`Decrease ${name}`}
                className="flex h-7 w-7 items-center justify-center text-[#830020] dark:text-[#FFB400] font-bold hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="font-bold text-[15px] min-w-[20px] text-center">{quantity}</span>
              <button
                type="button"
                onClick={onIncrease}
                aria-label={`Increase ${name}`}
                className="flex h-7 w-7 items-center justify-center text-[#830020] dark:text-[#FFB400] font-bold hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenOptions || onAdd}
              className="flex min-h-[44px] min-w-[96px] items-center justify-center gap-1.5 rounded-full bg-[#830020] px-4 text-[14px] font-bold text-white shadow-xs hover:bg-[#69001A] transition-colors"
            >
              <span>Add</span>
              <Plus className="h-4 w-4" />
            </button>
          )
        ) : (
          <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-3 py-1.5 text-[13px] font-semibold text-[var(--color-text-muted)]">
            Out of stock
          </span>
        )}
      </div>
    </article>
  );
}
