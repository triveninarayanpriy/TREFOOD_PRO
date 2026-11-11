import { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { QtyStepper } from '../ui/QtyStepper';
import { PaperBill } from '../ui/PaperBill';
import { Button } from '../ui/Button';
import { ShoppingBag, ArrowRight, Heart, ShieldCheck, Clock, Trash2 } from 'lucide-react';
import type { Gate } from '@shared/schemas';
import { getGateCurfewStatus } from '@shared/curfew';

const CheckoutModal = lazy(() =>
  import('../cart/CheckoutModal').then((m) => ({ default: m.CheckoutModal }))
);

export interface DesktopPacketSidebarProps {
  currentGate: Gate | null;
  onOpenGatePicker?: () => void;
  favoritesCount?: number;
}

export function DesktopPacketSidebar({
  currentGate,
  onOpenGatePicker,
  favoritesCount = 0,
}: DesktopPacketSidebarProps) {
  const { user } = useAuth();
  const {
    vendor,
    items,
    itemCount,
    updateQuantity,
    clearCart,
    couponCode,
    setCouponCode,
    quote,
    quoteError,
  } = useCart();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const gateStatus = currentGate ? getGateCurfewStatus(currentGate) : null;
  const localSubtotalPaise = items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);

  return (
    <aside
      aria-label="Campus Packet Summary"
      className="hidden lg:block lg:col-span-4 lg:sticky lg:top-20 space-y-4"
    >
      {items.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] space-y-3">
          <div className="flex items-center gap-2 border-b border-dashed border-[var(--color-border)] pb-3">
            <ShoppingBag className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-[var(--color-text)]">
              Your Campus Packet
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
            Pick chai, hot meals, shakes, snacks, or chicken from any open NIT Patna counter. Zero
            delivery fee; pay Cash or UPI at your gate.
          </p>
          {couponCode && (
            <div className="flex items-center justify-between rounded-lg border border-[#D48942]/40 bg-[#FFF9EE] px-3 py-2 text-xs text-[#1C1210] dark:bg-[#231914] dark:text-[#FBF6EE]">
              <span>
                Saved offer: <strong className="font-mono">{couponCode}</strong>
              </span>
              <button
                type="button"
                onClick={() => setCouponCode('')}
                className="underline font-semibold text-[#830020] dark:text-[#FFB400]"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Interactive Quantity Adjusters for Items Currently in Packet */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] space-y-2.5">
            <div className="flex items-center justify-between gap-2 border-b border-dashed border-[var(--color-border)] pb-2">
              {vendor ? (
                <Link
                  to={`/vendor/${vendor.slug}`}
                  className="font-display text-sm font-bold text-[#830020] hover:underline dark:text-[#FFB400] truncate"
                >
                  {vendor.name}
                </Link>
              ) : (
                <span className="font-display text-sm font-bold text-[var(--color-text)]">
                  Your Packet ({itemCount})
                </span>
              )}
              <button
                type="button"
                onClick={clearCart}
                className="inline-flex min-h-[32px] items-center gap-1 text-xs font-semibold text-[#B91C1C] hover:underline dark:text-[#FCA5A5]"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clear</span>
              </button>
            </div>

            <div className="max-h-52 overflow-y-auto divide-y divide-[var(--color-border-subtle)] pr-1">
              {items.map((item) => {
                const lineId = item.lineKey || item.itemId;
                return (
                  <div key={lineId} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--color-text)] truncate">
                        {item.name}
                      </div>
                      {(item.variantLabel || item.addonsLabel) && (
                        <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                          {[item.variantLabel, item.addonsLabel ? `+ ${item.addonsLabel}` : null]
                            .filter(Boolean)
                            .join(' • ')}
                        </div>
                      )}
                      <div className="font-mono text-xs text-[var(--color-text-muted)]">
                        ₹{Math.round((item.pricePaise * item.quantity) / 100)}
                      </div>
                    </div>
                    <QtyStepper
                      value={item.quantity}
                      onIncrease={() => updateQuantity(lineId, item.quantity + 1)}
                      onDecrease={() => updateQuantity(lineId, item.quantity - 1)}
                    />
                  </div>
                );
              })}
            </div>

            {quoteError && (
              <div className="rounded-lg border border-[#D48942] bg-[#FFF9EE] p-2.5 text-xs text-[#824410] dark:bg-[#231914] dark:text-[#FDE68A]">
                {quoteError}
              </div>
            )}
          </div>

          {/* Torn-edge Campus PaperBill Receipt */}
          <PaperBill
            vendorName={vendor?.name || 'Campus Counter'}
            gateName={currentGate?.name || 'Campus Gate'}
            items={items.map((it) => ({
              id: it.lineKey || it.itemId,
              label: it.name,
              qty: it.quantity,
              amountPaise: it.pricePaise * it.quantity,
            }))}
            subtotalPaise={quote?.subtotalPaise ?? localSubtotalPaise}
            packingTotalPaise={quote?.packingTotalPaise ?? 0}
            discountPaise={quote?.discountPaise ?? 0}
            couponCode={quote?.couponApplied}
            totalPaise={quote?.totalPaise ?? localSubtotalPaise}
            minOrderPaise={quote?.minOrderPaise ?? 0}
            footerAction={
              <Button
                type="button"
                variant="amber"
                disabled={Boolean(quoteError) || items.length === 0 || quote?.meetsMinOrder === false}
                onClick={() => setCheckoutOpen(true)}
                className="w-full min-h-[48px]"
              >
                <span>Checkout &amp; Collect</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            }
          />
        </div>
      )}

      {/* Selected Gate & Night Safety Snapshot */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] space-y-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold text-[var(--color-text)]">
            <Clock className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
            <span className="truncate">{currentGate?.name || 'Main Gate'}</span>
          </div>
          {onOpenGatePicker && (
            <button
              type="button"
              onClick={onOpenGatePicker}
              className="font-bold text-[#830020] hover:underline dark:text-[#FFB400] min-h-[32px] px-1"
            >
              Switch
            </button>
          )}
        </div>
        {gateStatus && (
          <p className="text-[var(--color-text-muted)]">
            {gateStatus.statusText}
            {gateStatus.countdownText ? ` · ${gateStatus.countdownText}` : ''}
          </p>
        )}
        <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-2.5">
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-text-muted)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#15803D]" aria-hidden="true" />
            <span>4-digit packet code handover</span>
          </span>
          <Link
            to="/favorites"
            className="inline-flex items-center gap-1 font-bold text-[#830020] hover:underline dark:text-[#FFB400]"
          >
            <Heart className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Saved{user && favoritesCount > 0 ? ` (${favoritesCount})` : ''}</span>
          </Link>
        </div>
      </div>

      {checkoutOpen && (
        <Suspense fallback={null}>
          <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
        </Suspense>
      )}
    </aside>
  );
}
