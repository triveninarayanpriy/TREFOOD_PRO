import { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { QtyStepper } from '../ui/QtyStepper';
import { EmptyState } from '../ui/EmptyState';
import { useCart } from '../../context/CartContext';
import { ShoppingBag, Trash2, AlertCircle, ArrowRight, Clock } from 'lucide-react';
import { CheckoutModal } from './CheckoutModal';

export interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const {
    vendor,
    items,
    itemCount,
    updateQuantity,
    updateNotes,
    clearCart,
    quote,
    quoteLoading,
    quoteError,
  } = useCart();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);

  const handleCheckoutClick = () => {
    setCheckoutOpen(true);
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Your Packet" maxWidth="max-w-md">
        {items.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-8 w-8 text-stone-400" />}
            title="Your packet is empty"
            description="Explore campus canteens and add meals, snacks, or groceries."
            actionLabel="Browse Canteens"
            onAction={onClose}
            className="py-12"
          />
        ) : (
          <div className="flex flex-col h-full space-y-4">
            {/* Vendor Banner */}
            <div className="flex items-center justify-between rounded-xl bg-stone-100 p-3 dark:bg-stone-850">
              <div className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  Ordering from
                </span>
                <h4 className="text-sm font-bold text-stone-900 truncate dark:text-stone-100">
                  {vendor?.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={clearCart}
                className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                aria-label="Clear cart"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>

            {/* Error / 409 Notice */}
            {quoteError && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>{quoteError}</div>
              </div>
            )}

            {/* Items List */}
            <div className="flex-1 divide-y divide-stone-100 overflow-y-auto max-h-[45vh] pr-1 dark:divide-stone-800">
              {items.map((item) => (
                <div key={item.itemId} className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            item.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                        />
                        <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-medium text-stone-500">
                        ₹{(item.pricePaise / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="shrink-0">
                      <QtyStepper
                        value={item.quantity}
                        onIncrease={() => updateQuantity(item.itemId, item.quantity + 1)}
                        onDecrease={() => updateQuantity(item.itemId, item.quantity - 1)}
                      />
                    </div>
                  </div>

                  {/* Notes / Special Instructions */}
                  <div className="text-xs">
                    {editingNotesId === item.itemId ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          maxLength={80}
                          placeholder="e.g. less spicy, extra ketchup (max 80 chars)"
                          defaultValue={item.notes || ''}
                          onBlur={(e) => {
                            updateNotes(item.itemId, e.target.value);
                            setEditingNotesId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateNotes(item.itemId, (e.target as HTMLInputElement).value);
                              setEditingNotesId(null);
                            }
                          }}
                          autoFocus
                          className="h-8 flex-1 rounded-lg border border-stone-300 px-2 text-xs dark:border-stone-700 dark:bg-stone-800"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingNotesId(null)}
                          className="text-xs text-stone-500 underline"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingNotesId(item.itemId)}
                        className="text-[11px] text-stone-500 hover:text-stone-700 underline dark:hover:text-stone-300"
                      >
                        {item.notes ? `Note: "${item.notes}" (edit)` : '+ Add note (e.g. less spicy)'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Summary */}
            <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-2 dark:border-stone-800 dark:bg-stone-900">
              <div className="flex justify-between text-xs text-stone-600 dark:text-stone-400">
                <span>Subtotal ({itemCount} items)</span>
                <span className="font-mono">
                  {quoteLoading ? '...' : `₹${((quote?.subtotalPaise || 0) / 100).toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-xs text-stone-600 dark:text-stone-400">
                <span>Delivery Fee</span>
                <span className="font-bold text-emerald-600">FREE</span>
              </div>
              {quote?.etaMinutes && (
                <div className="flex items-center gap-1.5 text-xs text-stone-500 pt-1">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  <span>Estimated delivery: ~{quote.etaMinutes} mins</span>
                </div>
              )}
              <div className="flex justify-between border-t border-stone-100 pt-2 text-sm font-bold text-stone-900 dark:border-stone-800 dark:text-stone-100">
                <span>Total to Collect</span>
                <span className="font-mono text-base text-[#830020] dark:text-amber-400">
                  {quoteLoading ? '...' : `₹${((quote?.totalPaise || 0) / 100).toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Checkout Action */}
            <div className="pt-2">
              <Button
                onClick={handleCheckoutClick}
                disabled={quoteLoading || !!quoteError || items.length === 0}
                variant="primary"
                className="w-full min-h-[48px] text-base"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </>
  );
}
