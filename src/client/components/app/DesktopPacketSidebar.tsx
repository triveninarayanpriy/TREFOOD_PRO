import { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { QtyStepper } from '../ui/QtyStepper';
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
    quoteLoading,
    quoteError,
  } = useCart();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const gateStatus = currentGate ? getGateCurfewStatus(currentGate) : null;

  return (
    <aside
      aria-label="Campus Packet Summary"
      className="hidden lg:block lg:col-span-4 lg:sticky lg:top-20 space-y-4"
    >
      {/* Active Packet Card */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
            <h2 className="text-sm font-bold text-[var(--color-text)]">Your Campus Packet</h2>
          </div>
          {itemCount > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="inline-flex min-h-[32px] items-center gap-1 text-xs font-semibold text-red-700 hover:underline dark:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="space-y-3 py-2">
            <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
              Pick a meal, fresh fruit, grocery staple, or cut from any open campus vendor. Pay zero delivery fee at your gate.
            </p>
            {couponCode && (
              <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <span>
                  Saved offer: <strong className="font-mono">{couponCode}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setCouponCode('')}
                  className="underline font-semibold"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {vendor && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-muted)]">From</span>
                <Link
                  to={`/vendor/${vendor.slug}`}
                  className="font-bold text-[#830020] hover:underline dark:text-[#FFB400] truncate max-w-[200px]"
                >
                  {vendor.name}
                </Link>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto divide-y divide-[var(--color-border-subtle)] pr-1">
              {items.map((item) => {
                const lineId = item.lineKey || item.itemId;
                return (
                  <div key={lineId} className="py-2.5 flex items-center justify-between gap-2">
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
                        ₹{((item.pricePaise * item.quantity) / 100).toFixed(0)}
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
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                {quoteError}
              </div>
            )}

            <div className="space-y-1.5 border-t border-[var(--color-border-subtle)] pt-3 text-xs">
              <div className="flex justify-between text-[var(--color-text-muted)]">
                <span>Subtotal ({itemCount} items)</span>
                <span className="font-mono">
                  {quoteLoading ? '...' : `₹${((quote?.subtotalPaise || 0) / 100).toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-[var(--color-text-muted)]">
                <span>Packing charges</span>
                <span className="font-mono">
                  {quoteLoading ? '...' : `₹${((quote?.packingTotalPaise || 0) / 100).toFixed(2)}`}
                </span>
              </div>
              {(quote?.discountPaise ?? 0) > 0 && (
                <div className="flex justify-between font-semibold text-[#15803D] dark:text-[#86EFAC]">
                  <span>Offer ({quote?.couponApplied})</span>
                  <span className="font-mono">-₹{((quote?.discountPaise || 0) / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-[var(--color-text-muted)]">
                <span>Gate delivery</span>
                <span className="font-bold text-[#15803D] dark:text-[#86EFAC]">FREE</span>
              </div>
              <div className="flex justify-between pt-1.5 text-sm font-extrabold text-[var(--color-text)]">
                <span>Total to Pay</span>
                <span className="font-mono text-[#830020] dark:text-[#FFB400]">
                  {quoteLoading ? '...' : `₹${((quote?.totalPaise || 0) / 100).toFixed(2)}`}
                </span>
              </div>
            </div>

            {quote?.meetsMinOrder === false && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                Add ₹{Math.ceil((quote.shortfallPaise || 0) / 100)} more to meet vendor minimum order.
              </div>
            )}

            <Button
              type="button"
              variant="primary"
              disabled={
                Boolean(quoteError) ||
                items.length === 0 ||
                quote?.meetsMinOrder === false
              }
              onClick={() => setCheckoutOpen(true)}
              className="w-full min-h-[48px]"
            >
              <span>Checkout & Collect</span>
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      {/* Selected Gate & Night Safety Snapshot */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] space-y-2.5 text-xs">
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
            {gateStatus.countdownText ? ` • ${gateStatus.countdownText}` : ''}
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
