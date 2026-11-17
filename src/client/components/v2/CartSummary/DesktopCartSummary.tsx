import { X, Plus, Minus, ShoppingBag, MapPin, ArrowRight, ShieldCheck } from 'lucide-react';
import type { CartItem } from '../../../context/CartContext';

export interface DesktopCartSummaryProps {
  open: boolean;
  onClose: () => void;
  vendorName: string;
  items: CartItem[];
  subtotalPaise: number;
  packingTotalPaise: number;
  totalPaise: number;
  gateName: string;
  gateCurfewLabel?: string;
  onIncrease: (key: string) => void;
  onDecrease: (key: string) => void;
  onCheckout: () => void;
  className?: string;
}

export function DesktopCartSummary({
  open,
  onClose,
  vendorName,
  items,
  subtotalPaise,
  packingTotalPaise,
  totalPaise,
  gateName,
  gateCurfewLabel,
  onIncrease,
  onDecrease,
  onCheckout,
  className = '',
}: DesktopCartSummaryProps) {
  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${className}`}>
      {/* Soft warm backdrop with 250ms transition */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-stone-950/40 backdrop-blur-[2px] transition-opacity duration-250"
      />

      {/* Slide-over panel from the right (max-w-md, 250ms ease-out) */}
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <aside
          role="dialog"
          aria-label="Order Cart"
          className="w-screen max-w-md bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-[var(--elevation-4)] flex flex-col justify-between transition-transform duration-250 ease-out"
        >
          {/* Header */}
          <div className="p-6 border-b border-[var(--color-border-subtle)] space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[24px] font-bold text-[var(--color-text)]">
                Your Campus Packet
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close cart"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-[14px] text-[var(--color-text-muted)] font-medium">
              Ordering from <span className="font-bold text-[var(--color-text)]">{vendorName}</span>
            </p>
          </div>

          {/* Itemized List with Large Stepper Buttons */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            {items.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <ShoppingBag className="mx-auto h-10 w-10 text-[var(--color-text-muted)] opacity-40" />
                <p className="font-display text-[18px] font-bold text-[var(--color-text)]">Your packet is empty</p>
                <p className="text-[14px] text-[var(--color-text-muted)]">Add dishes from the menu to get started.</p>
              </div>
            ) : (
              items.map((line) => {
                const lineKey = line.lineKey || line.itemId;
                const lineTotal = line.pricePaise * line.quantity;
                return (
                  <div
                    key={lineKey}
                    className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-4 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${
                            line.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                        />
                        <h4 className="font-sans text-[16px] font-bold text-[var(--color-text)] truncate">
                          {line.name}
                        </h4>
                      </div>
                      <div className="text-[14px] text-[var(--color-text-muted)]">
                        ₹{Math.round(line.pricePaise / 100)} each
                      </div>
                    </div>

                    {/* Large Stepper Buttons */}
                    <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2 py-1">
                      <button
                        type="button"
                        onClick={() => onDecrease(lineKey)}
                        aria-label={`Decrease ${line.name}`}
                        className="flex h-7 w-7 items-center justify-center text-[#830020] dark:text-[#FFB400] font-bold hover:bg-[var(--color-surface)] rounded-full transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-bold text-[14px] min-w-[18px] text-center">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onIncrease(lineKey)}
                        aria-label={`Increase ${line.name}`}
                        className="flex h-7 w-7 items-center justify-center text-[#830020] dark:text-[#FFB400] font-bold hover:bg-[var(--color-surface)] rounded-full transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="font-bold text-[16px] text-[var(--color-text)] min-w-[54px] text-right">
                      ₹{Math.round(lineTotal / 100)}
                    </div>
                  </div>
                );
              })
            )}

            {/* Gate Delivery Details */}
            {items.length > 0 && (
              <div className="mt-4 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4 space-y-2">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="inline-flex items-center gap-1.5 font-bold text-[var(--color-text)]">
                    <MapPin className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" />
                    <span>Deliver to: {gateName}</span>
                  </span>
                  {gateCurfewLabel && (
                    <span className="text-[13px] font-semibold text-stone-600 dark:text-stone-400">
                      Curfew: {gateCurfewLabel}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-emerald-800 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Zero delivery fee · Match 4-digit code at gate</span>
                </div>
              </div>
            )}
          </div>

          {/* Pricing Summary & Amber Checkout Action Button */}
          {items.length > 0 && (
            <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
              <div className="space-y-1.5 text-[14px]">
                <div className="flex justify-between text-[var(--color-text-muted)]">
                  <span>Subtotal</span>
                  <span>₹{Math.round(subtotalPaise / 100)}</span>
                </div>
                {packingTotalPaise > 0 && (
                  <div className="flex justify-between text-[var(--color-text-muted)]">
                    <span>Restaurant packing</span>
                    <span>₹{Math.round(packingTotalPaise / 100)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[var(--color-text-muted)]">
                  <span>Delivery fee</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">FREE ₹0</span>
                </div>
                <div className="flex justify-between text-[18px] font-extrabold text-[var(--color-text)] pt-2 border-t border-[var(--color-border-subtle)]">
                  <span>Total (Pay at gate)</span>
                  <span>₹{Math.round(totalPaise / 100)}</span>
                </div>
              </div>

              {/* One Large Checkout Action Button in Amber #FFB400 */}
              <button
                type="button"
                onClick={onCheckout}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#FFB400] px-6 text-[16px] font-extrabold text-[#1C1210] shadow-[var(--elevation-2)] hover:bg-[#E5A100] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Proceed to Gate Checkout</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
