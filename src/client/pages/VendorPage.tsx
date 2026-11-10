import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { MenuItemRow } from '../components/ui/MenuItemRow';
import { Skeleton, MenuItemSkeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { CartDrawer } from '../components/cart/CartDrawer';
import { SeoHead } from '../components/seo/SeoHead';
import { isNightSafetyActive } from '@shared/curfew';
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
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-36 rounded-lg" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="space-y-3 pt-2">
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
  const nightSafe = vendor.nightSafe !== false;
  const nightNow = isNightSafetyActive();

  const isCurrentVendorCart = currentCartVendor?.id === vendor.id;
  const vendorCartTotalPaise = isCurrentVendorCart
    ? cartItems.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0)
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 pb-28 space-y-6">
      <SeoHead
        title={`${vendor.name} Menu | TreFood NIT Patna`}
        description={vendor.description || `Order online from ${vendor.name} at NIT Patna with ₹0 delivery fee and 4-digit gate handover verification.`}
        path={`/vendor/${vendor.slug}`}
        jsonLd={{
          '@type': 'LocalBusiness',
          name: vendor.name,
          description: vendor.description,
          servesCuisine: vendor.category,
          priceRange: '₹',
        }}
      />
      <button
        type="button"
        onClick={() => navigate('/browse')}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>All Campus Canteens</span>
      </button>

      {/* Two-Column Desktop Layout (1440px): Menu + Sticky Packet Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          {/* Vendor Profile Header Card */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-[var(--shadow-card)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
                    {vendor.name}
                  </h1>
                  {vendor.nameHi && (
                    <span className="text-sm font-medium text-[var(--color-text-muted)]">
                      ({vendor.nameHi})
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)] capitalize">
                  {vendor.category.replace('_', ' ')} • NIT Patna Campus
                </p>
                {vendor.description && (
                  <p className="mt-2 text-xs text-[var(--color-text-muted)] max-w-xl">
                    {vendor.description}
                  </p>
                )}
              </div>

              <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                {!vendor.isOpen ? (
                  <Badge variant="closed">Closed</Badge>
                ) : isBusy ? (
                  <Badge variant="warning">Busy Mode</Badge>
                ) : (
                  <Badge variant="success">Open for Orders</Badge>
                )}

                {nightSafe && <Badge variant="night_safe">Night Safe</Badge>}

                {vendor.ratingAvg > 0 && (
                  <div className="inline-flex items-center gap-1 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-0.5 text-xs font-bold text-[#78350F] dark:border-[#92400E] dark:bg-[#3B2406] dark:text-[#FDE68A]">
                    <Star className="h-3.5 w-3.5 fill-[#FFB400] text-[#FFB400]" aria-hidden="true" />
                    <span>{vendor.ratingAvg.toFixed(1)}</span>
                    <span className="opacity-75 font-normal">({vendor.ratingCount})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Info Grid: Hours, Prep Time, FSSAI */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[var(--color-border-subtle)] pt-4 text-xs text-[var(--color-text-muted)]">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  Hours: {hours?.open || '09:00'} – {hours?.close || '22:00'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#FFB400] shrink-0" aria-hidden="true" />
                <span>Prep: ~{vendor.prepMinutes} mins</span>
              </div>

              {vendor.fssaiNo && (
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#15803D] shrink-0" aria-hidden="true" />
                  <span>FSSAI: {vendor.fssaiNo}</span>
                </div>
              )}
            </div>

            {/* Campus Night Safety Notice */}
            {nightSafe && (
              <div className="flex items-center gap-2.5 rounded-xl border border-[#FCD34D] bg-[#FFF8E1] px-3.5 py-2.5 text-xs font-semibold text-[#78350F] dark:border-[#92400E] dark:bg-[#331F04] dark:text-[#FDE68A]">
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {nightNow
                    ? 'Campus Night Safety Active (after 7 PM): deliveries are handled personally by owner, co-owner, or senior staff.'
                    : 'Campus Night Safety Guarantee: after 7:00 PM IST orders are delivered personally by owner or senior staff.'}
                </span>
              </div>
            )}
          </div>

          {/* Sticky Category Tabs */}
          <div className="sticky top-[65px] z-20 -mx-4 px-4 py-2.5 bg-[var(--color-surface-sunken)]/95 backdrop-blur-xs border-y border-[var(--color-border)] flex items-center gap-2 overflow-x-auto no-scrollbar">
            {vendor.categories?.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`min-h-[40px] whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#FFB400] ${
                  activeCategory === cat.id
                    ? 'bg-[#830020] text-white shadow-xs dark:bg-[#FFB400] dark:text-[#1C1917]'
                    : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Categories and Items rendered via MenuItemRow */}
          <div className="space-y-8">
            {vendor.categories?.map((cat) => {
              const items = cat.items || [];
              if (items.length === 0) return null;

              return (
                <section key={cat.id} id={`cat-${cat.id}`} className="space-y-3">
                  <h2 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
                    <span>{cat.name}</span>
                    <span className="text-xs font-normal text-[var(--color-text-muted)]">({items.length})</span>
                  </h2>

                  <div className="space-y-3">
                    {items.map((item: MenuItem) => {
                      const cartItem = isCurrentVendorCart
                        ? cartItems.find((ci) => ci.itemId === item.id)
                        : undefined;
                      const inCartQty = cartItem?.quantity || 0;

                      return (
                        <div key={item.id} className="space-y-2">
                          <MenuItemRow
                            id={item.id}
                            name={item.name}
                            nameHi={item.nameHi}
                            description={item.description}
                            pricePaise={item.pricePaise}
                            isVeg={item.isVeg}
                            inStock={item.inStock}
                            category={vendor.category}
                            quantity={inCartQty}
                            notes={cartItem?.notes}
                            onAddNote={() => setEditingNoteItemId(item.id)}
                            onAdd={() =>
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
                            onIncrease={() => updateQuantity(item.id, inCartQty + 1)}
                            onDecrease={() => updateQuantity(item.id, inCartQty - 1)}
                          />

                          {inCartQty > 0 && editingNoteItemId === item.id && (
                            <div className="flex items-center gap-2 pl-4">
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
                                className="h-9 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-text)]"
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setEditingNoteItemId(null)}
                              >
                                Done
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        {/* Sticky Desktop Packet Summary Column (and responsive bottom floating trigger on < lg) */}
        <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
          <div className="hidden lg:block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] space-y-3">
            <h3 className="text-sm font-bold text-[var(--color-text)] flex items-center justify-between">
              <span>Your Campus Packet</span>
              <span className="font-mono text-xs text-[var(--color-text-muted)]">{itemCount} items</span>
            </h3>
            {itemCount === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">
                Add items from {vendor.name} to inspect server-verified pricing, gate ETA, and place your pay-at-gate order.
              </p>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">
                Zero delivery fee. 4-digit handover verification code generated upon order confirmation.
              </p>
            )}
          </div>

          {itemCount > 0 && (
            <div className="fixed bottom-16 left-4 right-4 z-30 md:bottom-6 lg:static lg:z-auto">
              <div className="mx-auto max-w-md lg:max-w-none">
                <button
                  type="button"
                  onClick={() => setCartDrawerOpen(true)}
                  className="flex w-full min-h-[56px] items-center justify-between rounded-2xl bg-[#830020] p-4 text-white shadow-xl transition-transform hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#FFB400] dark:bg-[#FFB400] dark:text-[#1C1917]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 dark:bg-[#1C1917]/15 font-mono font-bold text-sm">
                      {itemCount}
                    </div>
                    <div className="text-left">
                      <div className="text-xs uppercase tracking-wide opacity-90">
                        {currentCartVendor?.name}
                      </div>
                      <div className="text-sm font-bold">
                        View Packet • ₹{(vendorCartTotalPaise / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold bg-white/20 dark:bg-[#1C1917]/15 px-3 py-1.5 rounded-xl">
                    <span>Open Cart</span>
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                  </div>
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Cart Drawer */}
      <CartDrawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />

      {/* Vendor Switch Confirmation Dialog */}
      <Dialog
        open={!!pendingVendorSwitch}
        onClose={cancelVendorSwitch}
        title="Start a new packet?"
        description={`Your cart currently contains items from "${currentCartVendor?.name}". Each order is delivered from one campus vendor.`}
      >
        <p className="text-xs text-[var(--color-text-muted)] pt-1 pb-4">
          Would you like to clear your current packet and add items from{' '}
          <span className="font-semibold text-[var(--color-text)]">
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
