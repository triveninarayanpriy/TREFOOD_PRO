import { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { QtyStepper } from '../ui/QtyStepper';
import { PaperBill } from '../ui/PaperBill';
import { EmptyState } from '../ui/EmptyState';
import { useCart } from '../../context/CartContext';
import { useToast } from '../ui/Toast';
import type { Gate } from '@shared/schemas';
import type { CouponSummary } from '@shared/types';
import {
  ShoppingBag,
  Trash2,
  AlertCircle,
  ArrowRight,
  Clock,
  Tag,
  Plus,
  Check,
  WifiOff,
  MapPin,
} from 'lucide-react';

const CheckoutModal = lazy(() =>
  import('./CheckoutModal').then((m) => ({ default: m.CheckoutModal }))
);

export interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const {
    vendor,
    items,
    selectedGateId,
    setSelectedGateId,
    addItem,
    updateQuantity,
    updateNotes,
    clearCart,
    couponCode,
    setCouponCode,
    scheduledFor,
    setScheduledFor,
    quote,
    quoteLoading,
    quoteError,
    isOfflineEstimate,
  } = useCart();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [couponDraft, setCouponDraft] = useState(couponCode || '');

  useEffect(() => {
    setCouponDraft(couponCode || '');
  }, [couponCode]);

  useEffect(() => {
    if (searchParams.get('checkout') === '1' && items.length > 0) {
      setCheckoutOpen(true);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('checkout');
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams, items.length]);

  const { data: gatesData } = useQuery<{ ok: boolean; gates: Gate[] }>({
    queryKey: ['gates'],
    queryFn: async () => {
      const res = await fetch('/api/gates');
      return res.json();
    },
    staleTime: 60000,
    enabled: open,
  });

  const { data: couponsData } = useQuery<{ ok: boolean; coupons: CouponSummary[] }>({
    queryKey: ['coupons'],
    queryFn: async () => {
      const res = await fetch('/api/coupons');
      if (!res.ok) return { ok: false, coupons: [] };
      return res.json();
    },
    staleTime: 60000,
    enabled: open,
  });

  const currentGate = gatesData?.gates?.find((g) => g.id === selectedGateId);
  const couponsList = couponsData?.coupons || [];
  const subtotalPaise =
    quote?.subtotalPaise ?? items.reduce((sum, i) => sum + i.pricePaise * i.quantity, 0);
  const minOrderPaise = quote?.minOrderPaise ?? 0;
  const shortfallPaise = quote?.shortfallPaise ?? 0;
  const meetsMinOrder = quote?.meetsMinOrder !== false && shortfallPaise <= 0;

  const handleApplyCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = couponDraft.trim().toUpperCase();
    if (!cleaned) return;
    setCouponCode(cleaned);
    showToast(`Checking coupon ${cleaned}...`, 'info');
  };

  const canProceedToCheckout =
    !quoteError &&
    items.length > 0 &&
    meetsMinOrder &&
    !isOfflineEstimate;

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Your Cart" maxWidth="max-w-md">
        {items.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-8 w-8 text-[var(--color-text-muted)]" />}
            title="Your cart is empty"
            description="Explore NIT Patna canteens and add hot meals, snacks, fruits, or groceries."
            actionLabel="Browse Canteens"
            onAction={onClose}
            className="py-12"
          />
        ) : (
          <div className="flex flex-col space-y-4 pb-2">
            {/* Offline Persistence Notice */}
            {isOfflineEstimate && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                <WifiOff className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <strong>Offline mode active:</strong> Cart items &amp; notes remain saved offline. Reconnect to verify prices and place order.
                </div>
              </div>
            )}

            {/* Vendor Header */}
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-3">
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Ordering from
                </span>
                <h3 className="text-sm font-bold text-[var(--color-text)] truncate">
                  {vendor?.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={clearCart}
                className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-xs font-bold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                aria-label="Clear cart"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clear</span>
              </button>
            </div>

            {/* Gate, ETA, Latest Safe Order Time & Curfew Warnings */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-bold text-[var(--color-text)] truncate">
                  <MapPin className="h-3.5 w-3.5 text-[#830020] dark:text-[#FFB400] shrink-0" aria-hidden="true" />
                  <span className="truncate">{currentGate?.name || selectedGateId}</span>
                </span>
                {quote?.etaMinutes && (
                  <span className="font-mono font-bold text-[#15803D] dark:text-[#86EFAC] shrink-0">
                    ~{quote.etaMinutes} min
                    {quote.estimatedArrivalIst ? ` (${quote.estimatedArrivalIst} IST)` : ''}
                  </span>
                )}
              </div>

              {quote?.latestOrderTime && (
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    Latest safe order time for this gate: <strong>{quote.latestOrderTime} IST</strong>
                  </span>
                </div>
              )}

              {quote && !quote.canDeliver && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-950 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" aria-hidden="true" />
                    <div>
                      <div className="font-bold">Gate delivery alert</div>
                      <p className="mt-0.5 leading-relaxed">
                        {quote.deliveryMessage ||
                          'Gate closes before packet arrival or vendor cannot deliver now.'}
                      </p>
                    </div>
                  </div>

                  {quote.alternativeGates && quote.alternativeGates.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="font-semibold">Switch to open gate:</span>
                      {quote.alternativeGates.map((alt) => (
                        <button
                          key={alt.gateId}
                          type="button"
                          onClick={() => {
                            setSelectedGateId(alt.gateId);
                            showToast(`Switched delivery gate to ${alt.gateName}`, 'success');
                          }}
                          className="min-h-[36px] rounded-lg bg-[#830020] px-2.5 text-xs font-bold text-white hover:bg-[#6a001a] dark:bg-[#FFB400] dark:text-[#1C1917]"
                        >
                          {alt.gateName} ({alt.curfewTime})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Price / Stock Conflict Error */}
            {quoteError && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" aria-hidden="true" />
                <div>{quoteError}</div>
              </div>
            )}

            {/* Items List with Stepper & Special Instructions */}
            <div className="divide-y divide-[var(--color-border-subtle)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3">
              {items.map((item) => {
                const lineId = item.lineKey || item.itemId;
                return (
                  <div key={lineId} className="py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                              item.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                            }`}
                          />
                          <span className="text-sm font-semibold text-[var(--color-text)] truncate">
                            {item.name}
                          </span>
                        </div>
                        {(item.variantLabel || item.addonsLabel) && (
                          <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                            {[item.variantLabel, item.addonsLabel ? `+ ${item.addonsLabel}` : null]
                              .filter(Boolean)
                              .join(' • ')}
                          </div>
                        )}
                        <span className="text-xs font-mono font-medium text-[var(--color-text-muted)]">
                          ₹{(item.pricePaise / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="shrink-0">
                        <QtyStepper
                          value={item.quantity}
                          onIncrease={() => updateQuantity(lineId, item.quantity + 1)}
                          onDecrease={() => updateQuantity(lineId, item.quantity - 1)}
                        />
                      </div>
                    </div>

                    <div className="text-xs">
                      {editingNotesId === lineId ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            maxLength={80}
                            aria-label={`Special instructions for ${item.name}`}
                            placeholder="e.g. less spicy, extra ketchup (max 80 chars)"
                            defaultValue={item.notes || ''}
                            onBlur={(e) => {
                              updateNotes(lineId, e.target.value);
                              setEditingNotesId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateNotes(lineId, (e.target as HTMLInputElement).value);
                                setEditingNotesId(null);
                              }
                            }}
                            autoFocus
                            className="h-9 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs text-[var(--color-text)]"
                          />
                          <button
                            type="button"
                            onClick={() => setEditingNotesId(null)}
                            className="min-h-[36px] px-2 text-xs font-semibold text-[var(--color-text-muted)] underline"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingNotesId(lineId)}
                          className="min-h-[32px] text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline"
                        >
                          {item.notes ? `Note: "${item.notes}" (edit)` : '+ Special instructions'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coupon Field & Visible Eligible Coupons List */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-3">
              <form onSubmit={handleApplyCouponSubmit} className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" aria-hidden="true" />
                  <input
                    type="text"
                    value={couponDraft}
                    onChange={(e) => setCouponDraft(e.target.value.toUpperCase())}
                    aria-label="Coupon code"
                    placeholder="Enter coupon code (e.g. CAMPUS20)"
                    className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] pl-8 pr-3 font-mono text-xs font-bold uppercase text-[var(--color-text)] focus:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
                  />
                </div>
                {couponCode && couponDraft === couponCode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCouponCode('');
                      setCouponDraft('');
                    }}
                    className="min-h-[40px] rounded-xl border border-[var(--color-border)] px-3 text-xs font-bold text-red-700 hover:bg-red-50 dark:text-red-400"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="min-h-[40px] rounded-xl bg-[#830020] px-3.5 text-xs font-bold text-white dark:bg-[#FFB400] dark:text-[#1C1917]"
                  >
                    Apply
                  </button>
                )}
              </form>

              {quote?.couponError && (
                <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  {quote.couponError}
                </div>
              )}

              {couponsList.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Available Campus Coupons
                  </div>
                  <div
                    tabIndex={0}
                    role="region"
                    aria-label="Available Campus Coupons"
                    className="max-h-36 overflow-y-auto space-y-1.5 pr-0.5 focus:outline-none focus:ring-2 focus:ring-[#FFB400] rounded-lg"
                  >
                    {couponsList.map((cp) => {
                      const eligibleNow = subtotalPaise >= cp.minOrderPaise;
                      const isApplied = couponCode === cp.code && (quote?.discountPaise ?? 0) > 0;
                      const shortfallRupees = Math.ceil((cp.minOrderPaise - subtotalPaise) / 100);
                      return (
                        <div
                          key={cp.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] px-2.5 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-extrabold text-[#830020] dark:text-[#FFB400]">
                                {cp.code}
                              </span>
                              {isApplied && (
                                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#15803D] dark:text-[#86EFAC]">
                                  <Check className="h-3 w-3" aria-hidden="true" />
                                  Saved ₹{((quote?.discountPaise || 0) / 100).toFixed(0)}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                              {eligibleNow
                                ? cp.description
                                : `Add ₹${shortfallRupees} more (min ₹${Math.round(cp.minOrderPaise / 100)})`}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={!eligibleNow}
                            onClick={() => {
                              setCouponCode(isApplied ? '' : cp.code);
                            }}
                            className="min-h-[34px] shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs font-bold text-[var(--color-text)] hover:border-[#830020] disabled:opacity-45 disabled:cursor-not-allowed"
                          >
                            {isApplied ? 'Applied' : 'Apply'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {scheduledFor && (
              <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-xs text-[var(--color-text)]">
                <span>Scheduled delivery slot active</span>
                <button
                  type="button"
                  onClick={() => setScheduledFor(null)}
                  className="font-bold text-[#830020] underline dark:text-[#FFB400]"
                >
                  Clear slot
                </button>
              </div>
            )}

            {/* Printed Torn-Edge Campus PaperBill Receipt */}
            <PaperBill
              vendorName={vendor?.name || 'Campus Counter'}
              gateName={currentGate?.name || selectedGateId}
              items={items.map((it) => ({
                id: it.lineKey || it.itemId,
                label: it.name,
                qty: it.quantity,
                amountPaise: it.pricePaise * it.quantity,
              }))}
              subtotalPaise={subtotalPaise}
              packingTotalPaise={quote?.packingTotalPaise || 0}
              discountPaise={quote?.discountPaise || 0}
              couponCode={quote?.couponApplied}
              totalPaise={quote?.totalPaise ?? subtotalPaise}
              minOrderPaise={minOrderPaise}
              suggestedAddonsSlot={
                !meetsMinOrder && quote?.suggestedAddons && quote.suggestedAddons.length > 0 && vendor ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Quick add-ons from {vendor.name}
                    </div>
                    <div
                      role="group"
                      aria-label="Suggested add-ons"
                      className="flex flex-wrap gap-2"
                    >
                      {quote.suggestedAddons.map((addon) => (
                        <button
                          key={addon.id}
                          type="button"
                          onClick={() =>
                            addItem(vendor, {
                              itemId: addon.id,
                              name: addon.name,
                              pricePaise: addon.pricePaise,
                              isVeg: addon.isVeg,
                            })
                          }
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs font-semibold text-[var(--color-text)] hover:border-[#830020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
                        >
                          <Plus className="h-3.5 w-3.5 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
                          <span className="max-w-[140px] truncate">{addon.name}</span>
                          <span className="font-mono font-bold">₹{Math.round(addon.pricePaise / 100)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null
              }
              footerAction={
                <Button
                  onClick={() => setCheckoutOpen(true)}
                  disabled={!canProceedToCheckout}
                  variant="amber"
                  className="w-full min-h-[48px] text-base"
                >
                  <span>
                    {!meetsMinOrder
                      ? `Add ₹${Math.ceil(shortfallPaise / 100)} more to checkout`
                      : quoteLoading
                      ? 'Verifying bill...'
                      : 'Proceed to Checkout'}
                  </span>
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              }
            />
          </div>
        )}
      </Sheet>

      {checkoutOpen && (
        <Suspense fallback={null}>
          <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
