import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { QtyStepper } from '../components/ui/QtyStepper';
import { Skeleton, MenuItemSkeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { CartDrawer } from '../components/cart/CartDrawer';
import {
  Clock,
  Star,
  ShieldCheck,
  ArrowLeft,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import type { VendorDetail, MenuItem } from '@shared/types';

export function VendorPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const {
    vendor: currentCartVendor,
    items: cartItems,
    itemCount,
    addItem,
    updateQuantity,
    updateNotes,
    pendingVendorSwitch,
    confirmVendorSwitch,
    cancelVendorSwitch,
  } = useCart();

  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(null);

  const {
    data: vendorData,
    isLoading,
    error,
    refetch,
  } = useQuery<{ ok: boolean; vendor: VendorDetail }>({
    queryKey: ['vendor', slug],
    queryFn: async () => {
      const res = await fetch(`/api/vendors/${slug}`);
      if (!res.ok) throw new Error('Vendor not found');
      return res.json();
    },
    staleTime: 30000,
  });

  const vendor = vendorData?.vendor;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="space-y-4 pt-4">
          <MenuItemSkeleton />
          <MenuItemSkeleton />
          <MenuItemSkeleton />
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <ErrorState
          title="Vendor not found"
          message="We could not find this campus canteen or store. It may have been closed or suspended."
          onRetry={() => refetch()}
        />
        <div className="mt-4 text-center">
          <Button onClick={() => navigate('/browse')} variant="secondary" size="sm">
            Back to Canteens
          </Button>
        </div>
      </div>
    );
  }

  const hours = vendor.hoursJson ? JSON.parse(vendor.hoursJson) : null;
  const isBusy = vendor.busyUntil && vendor.busyUntil > Math.floor(Date.now() / 1000);

  // Cart total paise for items belonging to this vendor
  const isCurrentVendorCart = currentCartVendor?.id === vendor.id;
  const vendorCartTotalPaise = isCurrentVendorCart
    ? cartItems.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0)
    : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 pb-24 space-y-6">
      {/* Top Navigation */}
      <button
        type="button"
        onClick={() => navigate('/browse')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>All Campus Canteens</span>
      </button>

      {/* Vendor Profile Header Card */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                {vendor.name}
              </h1>
              {vendor.nameHi && (
                <span className="text-sm font-medium text-stone-400 dark:text-stone-500">
                  ({vendor.nameHi})
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-stone-500 capitalize">
              {vendor.category.replace('_', ' ')} • NIT Patna Campus
            </p>
            {vendor.description && (
              <p className="mt-2 text-xs text-stone-600 dark:text-stone-300 max-w-xl">
                {vendor.description}
              </p>
            )}
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2">
            {!vendor.isOpen ? (
              <Badge variant="danger">Closed</Badge>
            ) : isBusy ? (
              <Badge variant="warning">Busy Mode Active</Badge>
            ) : (
              <Badge variant="success">Open for Orders</Badge>
            )}

            {vendor.ratingAvg > 0 && (
              <div className="flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 dark:bg-amber-950/50 dark:border-amber-800">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span>{vendor.ratingAvg.toFixed(1)}</span>
                <span className="text-stone-400 font-normal">({vendor.ratingCount})</span>
              </div>
            )}
          </div>
        </div>

        {/* Info Grid: FSSAI, Hours, Prep Time */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-stone-100 pt-4 dark:border-stone-800 text-xs">
          <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
            <Clock className="h-4 w-4 text-stone-400 shrink-0" />
            <span>
              Hours: {hours?.open || '09:00'} – {hours?.close || '22:00'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Prep: ~{vendor.prepMinutes} mins</span>
          </div>

          {vendor.fssaiNo && (
            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>FSSAI: {vendor.fssaiNo}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Category Tabs */}
      <div className="sticky top-14 z-20 -mx-4 px-4 py-2 bg-stone-50/95 backdrop-blur-xs border-b border-stone-200 dark:bg-stone-950/95 dark:border-stone-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {vendor.categories?.map((cat: any) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setActiveCategory(cat.id);
              document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeCategory === cat.id
                ? 'bg-[#830020] text-white shadow-xs dark:bg-amber-400 dark:text-stone-950'
                : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu Categories and Items */}
      <div className="space-y-8">
        {vendor.categories?.map((cat: any) => {
          const items = cat.items || [];
          if (items.length === 0) return null;

          return (
            <section key={cat.id} id={`cat-${cat.id}`} className="space-y-3">
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>{cat.name}</span>
                <span className="text-xs font-normal text-stone-400">({items.length})</span>
              </h2>

              <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
                {items.map((item: MenuItem) => {
                  const cartItem = isCurrentVendorCart
                    ? cartItems.find((ci) => ci.itemId === item.id)
                    : undefined;
                  const inCartQty = cartItem?.quantity || 0;

                  return (
                    <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-full ring-2 ${
                              item.isVeg
                                ? 'bg-emerald-600 ring-emerald-100 dark:ring-emerald-950'
                                : 'bg-red-600 ring-red-100 dark:ring-red-950'
                            }`}
                            title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                          />
                          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                            {item.name}
                          </h3>
                          {item.nameHi && (
                            <span className="text-xs text-stone-400">({item.nameHi})</span>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-lg">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-sm font-mono font-bold text-stone-900 dark:text-stone-100">
                            ₹{(item.pricePaise / 100).toFixed(2)}
                          </span>
                          {!item.inStock && (
                            <Badge variant="danger" className="text-[10px]">
                              Sold Out
                            </Badge>
                          )}
                        </div>

                        {/* Note preview or note edit trigger */}
                        {inCartQty > 0 && (
                          <div className="pt-1 text-xs">
                            {editingNoteItemId === item.id ? (
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  maxLength={80}
                                  placeholder="e.g. less spicy (max 80 chars)"
                                  defaultValue={cartItem?.notes || ''}
                                  onBlur={(e) => {
                                    updateNotes(item.id, e.target.value);
                                    setEditingNoteItemId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      updateNotes(item.id, (e.target as HTMLInputElement).value);
                                      setEditingNoteItemId(null);
                                    }
                                  }}
                                  autoFocus
                                  className="h-7 w-60 rounded border border-stone-300 px-2 text-xs dark:border-stone-700 dark:bg-stone-800"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditingNoteItemId(null)}
                                  className="text-stone-500 underline"
                                >
                                  Done
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditingNoteItemId(item.id)}
                                className="text-[11px] text-stone-500 hover:text-stone-700 underline dark:hover:text-stone-300"
                              >
                                {cartItem?.notes
                                  ? `Note: "${cartItem.notes}" (edit)`
                                  : '+ Add note (e.g. less spicy)'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quantity Controls / Add Button */}
                      <div className="flex items-center justify-end shrink-0">
                        {!item.inStock ? (
                          <button
                            disabled
                            className="rounded-xl border border-stone-200 px-3.5 py-1.5 text-xs font-semibold text-stone-400 dark:border-stone-800 cursor-not-allowed"
                          >
                            Out of stock
                          </button>
                        ) : inCartQty > 0 ? (
                          <QtyStepper
                            value={inCartQty}
                            onIncrease={() => updateQuantity(item.id, inCartQty + 1)}
                            onDecrease={() => updateQuantity(item.id, inCartQty - 1)}
                          />
                        ) : (
                          <Button
                            onClick={() =>
                              addItem(
                                { id: vendor.id, name: vendor.name, slug: vendor.slug },
                                {
                                  itemId: item.id,
                                  name: item.name,
                                  pricePaise: item.pricePaise,
                                  isVeg: item.isVeg,
                                }
                              )
                            }
                            variant="secondary"
                            size="sm"
                            className="min-h-[38px] px-4 font-bold text-[#830020] border-[#830020]/20 hover:bg-[#830020]/5 dark:text-amber-400 dark:border-amber-400/20"
                          >
                            + Add
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Floating Bottom Cart Bar when items are present */}
      {itemCount > 0 && (
        <div className="fixed bottom-16 sm:bottom-6 left-0 right-0 z-30 px-4">
          <div className="mx-auto max-w-md">
            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="flex w-full items-center justify-between rounded-2xl bg-[#830020] p-4 text-white shadow-xl transition-transform hover:scale-[1.01] active:scale-[0.99] dark:bg-amber-400 dark:text-stone-950"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 font-mono font-bold text-sm">
                  {itemCount}
                </div>
                <div className="text-left">
                  <div className="text-xs uppercase tracking-wide opacity-80">
                    {currentCartVendor?.name}
                  </div>
                  <div className="text-sm font-bold">
                    View Packet • ₹{(vendorCartTotalPaise / 100).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold bg-white/20 px-3 py-1.5 rounded-xl">
                <span>Open Cart</span>
                <ShoppingBag className="h-4 w-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />

      {/* Vendor Switch Confirmation Dialog */}
      <Dialog
        open={!!pendingVendorSwitch}
        onClose={cancelVendorSwitch}
        title="Start a new packet?"
        description={`Your cart currently contains items from "${currentCartVendor?.name}". Each order is delivered from one campus vendor.`}
      >
        <p className="text-xs text-stone-600 dark:text-stone-400 pt-1 pb-4">
          Would you like to clear your current packet and add items from{' '}
          <span className="font-semibold text-stone-900 dark:text-stone-100">
            {pendingVendorSwitch?.vendor.name}
          </span>
          ?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={cancelVendorSwitch}>
            Keep existing items
          </Button>
          <Button variant="danger" onClick={confirmVendorSwitch}>
            Clear & switch vendor
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
