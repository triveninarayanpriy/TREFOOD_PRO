import { useState, useEffect } from 'react';
import { Sheet } from '../ui/Sheet';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { QtyStepper } from '../ui/QtyStepper';
import { getVendorImageUrl } from '../ui/VendorCard';
import type { EnrichedMenuItem } from '@shared/types';

export interface ItemOptionsSelection {
  variantId?: string;
  variantLabel?: string;
  addonIds?: string[];
  addonsLabel?: string;
  unitPricePaise: number;
  quantity: number;
  notes?: string;
}

export interface ItemOptionsSheetProps {
  item: EnrichedMenuItem | null;
  vendorCategory: string;
  open: boolean;
  onClose: () => void;
  onConfirmAdd: (selection: ItemOptionsSelection) => void;
}

export function ItemOptionsSheet({
  item,
  vendorCategory,
  open,
  onClose,
  onConfirmAdd,
}: ItemOptionsSheetProps) {
  const variants = item?.variants || [];
  const addons = item?.addons || [];

  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && item) {
      setSelectedVariantId(item.variants?.[0]?.id);
      setSelectedAddonIds([]);
      setQuantity(1);
      setNotes('');
    }
  }, [open, item]);

  if (!item) return null;

  const activeVariant = variants.find((v) => v.id === selectedVariantId) || variants[0];
  const variantDelta = activeVariant?.priceDeltaPaise || 0;
  const activeAddons = addons.filter((a) => selectedAddonIds.includes(a.id));
  const addonsTotal = activeAddons.reduce((sum, a) => sum + a.pricePaise, 0);
  const unitPricePaise = item.pricePaise + variantDelta + addonsTotal;
  const totalPaise = unitPricePaise * quantity;

  const toggleAddon = (id: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    onConfirmAdd({
      variantId: activeVariant?.id,
      variantLabel: activeVariant?.label,
      addonIds: activeAddons.length > 0 ? activeAddons.map((a) => a.id) : undefined,
      addonsLabel: activeAddons.length > 0 ? activeAddons.map((a) => a.label).join(', ') : undefined,
      unitPricePaise,
      quantity,
      notes: notes.trim() ? notes.trim().slice(0, 80) : undefined,
    });
    onClose();
  };

  const imgSrc = item.imageUrl || getVendorImageUrl(vendorCategory);

  return (
    <Sheet open={open} onClose={onClose} title="Customise Item" maxWidth="max-w-lg">
      <div className="space-y-5 pb-2">
        {/* Item Summary */}
        <div className="flex items-start gap-3.5">
          <img
            src={imgSrc}
            alt={item.name}
            width={72}
            height={72}
            loading="lazy"
            className={`h-[72px] w-[72px] rounded-2xl object-cover shrink-0 border border-[var(--color-border)] bg-[var(--color-surface-sunken)] ${
              !item.inStock ? 'grayscale opacity-70' : ''
            }`}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={item.isVeg ? 'veg' : 'nonveg'} />
              <h3 className="text-base font-bold text-[var(--color-text)]">{item.name}</h3>
            </div>
            {item.nameHi && (
              <p className="text-xs text-[var(--color-text-muted)]">{item.nameHi}</p>
            )}
            {item.description && (
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                {item.description}
              </p>
            )}
            <div className="pt-1 flex items-center gap-2">
              <span className="font-mono text-sm font-extrabold text-[var(--color-text)]">
                Base ₹{(item.pricePaise / 100).toFixed(2)}
              </span>
              {!item.inStock && <Badge variant="closed">Out of stock</Badge>}
            </div>
          </div>
        </div>

        {/* Variants Radio List */}
        {variants.length > 0 && (
          <fieldset className="space-y-2 rounded-2xl border border-[var(--color-border)] p-3.5">
            <legend className="px-1 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Choose Portion / Variant (Required)
            </legend>
            <div className="space-y-2">
              {variants.map((v) => {
                const checked = activeVariant?.id === v.id;
                const priceWithVariant = item.pricePaise + v.priceDeltaPaise;
                return (
                  <label
                    key={v.id}
                    className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                      checked
                        ? 'border-[#830020] bg-[#FFF8E1]/60 text-[var(--color-text)] dark:border-[#FFB400] dark:bg-[#331F04]/40'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="item-variant"
                        checked={checked}
                        onChange={() => setSelectedVariantId(v.id)}
                        className="h-4 w-4 accent-[#830020]"
                      />
                      <span>{v.label}</span>
                    </span>
                    <span className="font-mono font-bold">
                      ₹{(priceWithVariant / 100).toFixed(0)}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* Add-ons Checkbox List */}
        {addons.length > 0 && (
          <fieldset className="space-y-2 rounded-2xl border border-[var(--color-border)] p-3.5">
            <legend className="px-1 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Optional Add-ons
            </legend>
            <div className="space-y-2">
              {addons.map((addon) => {
                const checked = selectedAddonIds.includes(addon.id);
                return (
                  <label
                    key={addon.id}
                    className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                      checked
                        ? 'border-[#830020] bg-[#FFF8E1]/60 text-[var(--color-text)] dark:border-[#FFB400] dark:bg-[#331F04]/40'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAddon(addon.id)}
                        className="h-4 w-4 accent-[#830020]"
                      />
                      <Badge variant={addon.isVeg === false ? 'nonveg' : 'veg'} />
                      <span>{addon.label}</span>
                    </span>
                    <span className="font-mono font-bold">
                      +₹{(addon.pricePaise / 100).toFixed(0)}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* Kitchen Instructions */}
        <div className="space-y-1.5">
          <label
            htmlFor="item-sheet-notes"
            className="text-xs font-semibold text-[var(--color-text-muted)]"
          >
            Cooking note (optional, max 80 chars)
          </label>
          <input
            id="item-sheet-notes"
            type="text"
            maxLength={80}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. less oil, extra green chutney"
            className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-text)] focus:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
          />
        </div>

        {/* Footer Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-3">
          <QtyStepper
            value={quantity}
            onIncrease={() => setQuantity((q) => q + 1)}
            onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
          />
          <Button
            type="button"
            variant="primary"
            disabled={!item.inStock}
            onClick={handleConfirm}
            className="min-h-[48px] flex-1"
          >
            {item.inStock
              ? `Add to Packet • ₹${(totalPaise / 100).toFixed(2)}`
              : 'Currently Out of Stock'}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
