import { Badge } from './Badge';
import { QuantityStepper } from './QuantityStepper';
import { getVendorImageUrl } from './VendorCard';

export interface MenuItemRowProps {
  id?: string;
  name: string;
  nameHi?: string | null;
  description?: string;
  pricePaise: number;
  isVeg: boolean;
  inStock: boolean;
  category?: string;
  imageUrl?: string;
  quantity?: number;
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
  onAdd,
  onIncrease,
  onDecrease,
  notes,
  onAddNote,
}: MenuItemRowProps) {
  const imgSrc = imageUrl || getVendorImageUrl(category);

  return (
    <div
      className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <img
          src={imgSrc}
          alt={name}
          width={64}
          height={64}
          loading="lazy"
          className={`h-16 w-16 rounded-xl object-cover shrink-0 border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] ${
            !inStock ? 'grayscale opacity-75' : ''
          }`}
        />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isVeg ? 'veg' : 'nonveg'} />
            <h3 className="text-sm font-bold text-[var(--color-text)] leading-snug">{name}</h3>
            {nameHi && (
              <span className="text-xs text-[var(--color-text-muted)]">({nameHi})</span>
            )}
          </div>

          {description && (
            <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">{description}</p>
          )}

          <div className="pt-0.5 flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm font-extrabold text-[var(--color-text)]">
              ₹{(pricePaise / 100).toFixed(2)}
            </span>
            {!inStock && <Badge variant="closed">Out of stock</Badge>}
            {quantity > 0 && onAddNote && (
              <button
                type="button"
                onClick={onAddNote}
                className="min-h-[32px] text-xs font-semibold text-[#830020] underline hover:opacity-80 dark:text-[#FFB400] focus:outline-none focus:ring-2 focus:ring-[#FFB400] rounded"
              >
                {notes ? `Note: "${notes}"` : '+ Add note'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 flex items-center self-center">
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
