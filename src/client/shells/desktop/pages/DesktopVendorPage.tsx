import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart, buildCartLineKey } from '../../../context/CartContext';
import { ResponsiveImage } from '../../../components/ui/ResponsiveImage';
import { QuantityStepper } from '../../../components/ui/QuantityStepper';
import { DesktopCardSkeleton } from '../../../components/v2/Skeleton/Skeleton';
import { EmptyStateV2 } from '../../../components/v2/EmptyState/EmptyState';
import { DialogV2 } from '../../../components/v2/Dialog/Dialog';
import { ItemOptionsSheet, type ItemOptionsSelection } from '../../../components/app/ItemOptionsSheet';
import {
  ArrowLeft,
  Clock,
  Star,
  ShieldCheck,
  Leaf,
  UtensilsCrossed,
  Plus,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import type { VendorDetail, EnrichedMenuItem } from '@shared/types';

export function DesktopVendorPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const {
    vendor: currentCartVendor,
    items: cartItems,
    addItem,
    updateQuantity,
    pendingVendorSwitch,
    confirmVendorSwitch,
    cancelVendorSwitch,
  } = useCart();

  const [vegOnly, setVegOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [sheetItem, setSheetItem] = useState<EnrichedMenuItem | null>(null);

  const {
    data: vendorData,
    isLoading,
    error,
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

  const categories = useMemo(() => {
    if (!vendor?.categories) return [];
    return vendor.categories
      .map((cat) => ({
        ...cat,
        items: vegOnly ? cat.items.filter((i) => i.isVeg) : cat.items,
      }))
      .filter((cat) => cat.items.length > 0);
  }, [vendor?.categories, vegOnly]);

  // Set initial active category
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  // Scroll-Spy: Track visible section and update activeCategory
  useEffect(() => {
    if (categories.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const catId = entry.target.id.replace('cat-', '');
            setActiveCategory(catId);
          }
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
    );

    categories.forEach((cat) => {
      const el = document.getElementById(`cat-${cat.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [categories]);

  const getItemCartQuantity = (itemId: string) => {
    if (currentCartVendor?.id !== vendor?.id) return 0;
    return cartItems
      .filter((ci) => ci.itemId === itemId)
      .reduce((sum, ci) => sum + ci.quantity, 0);
  };

  const handleAddItem = (item: EnrichedMenuItem) => {
    if ((item.variants && item.variants.length > 0) || (item.addons && item.addons.length > 0)) {
      setSheetItem(item);
      return;
    }

    if (!vendor) return;
    addItem(
      { id: vendor.id, name: vendor.name, slug: vendor.slug },
      {
        itemId: item.id,
        name: item.name,
        pricePaise: item.pricePaise,
        isVeg: item.isVeg,
      }
    );
  };

  const handleSheetConfirm = (item: EnrichedMenuItem, selection: ItemOptionsSelection) => {
    if (!vendor) return;
    const lineKey = buildCartLineKey(item.id, selection.variantId, selection.addonIds);
    addItem(
      { id: vendor.id, name: vendor.name, slug: vendor.slug },
      {
        itemId: item.id,
        lineKey,
        name: item.name,
        pricePaise: selection.unitPricePaise,
        isVeg: item.isVeg,
        variantId: selection.variantId,
        variantLabel: selection.variantLabel,
        addonIds: selection.addonIds,
        addonsLabel: selection.addonsLabel,
        quantity: selection.quantity,
        notes: selection.notes,
      }
    );
    setSheetItem(null);
  };

  const handleDecreaseItem = (item: EnrichedMenuItem) => {
    const cartLine = cartItems.find((ci) => ci.itemId === item.id);
    if (cartLine) {
      updateQuantity(cartLine.lineKey || cartLine.itemId, cartLine.quantity - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse pb-16">
        <div className="h-6 w-36 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="aspect-[21/9] w-full rounded-[28px] bg-stone-200 dark:bg-stone-800" />
        <div className="grid grid-cols-2 gap-6">
          <DesktopCardSkeleton />
          <DesktopCardSkeleton />
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <EmptyStateV2
        icon={<UtensilsCrossed className="h-10 w-10" />}
        title="Counter Not Found"
        description="We could not find this campus counter. It may be closed or suspended."
        actionLabel="Back to Campus Counters"
        onAction={() => navigate('/app')}
      />
    );
  }

  const hours = vendor.hoursJson ? JSON.parse(vendor.hoursJson) : null;
  const rupeeMin = Math.round((vendor.minOrderPaise ?? 0) / 100);

  // Cart calculations for this vendor
  const isThisVendorCart = currentCartVendor?.id === vendor.id;
  const currentVendorItems = isThisVendorCart ? cartItems : [];
  const hasCartItems = currentVendorItems.length > 0;

  const subtotalPaise = currentVendorItems.reduce(
    (sum, item) => sum + item.pricePaise * item.quantity,
    0
  );
  const packingPaise = hasCartItems ? 1000 : 0; // ₹10 packaging
  const totalPaise = subtotalPaise + packingPaise;

  const handleScrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    const el = document.getElementById(`cat-${catId}`);
    if (el) {
      const topOffset = 100;
      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - topOffset,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="space-y-10 pb-24">
      {/* Back button & Breadcrumb */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-2 text-[15px] font-bold text-[var(--color-text-muted)] hover:text-[#830020] dark:hover:text-[#FFB400] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] rounded"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>All NIT Patna Counters</span>
        </button>
      </div>

      {/* Editorial 21:9 Cover Photo Hero Card */}
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--elevation-3)]">
        <div className="relative aspect-[21/9] w-full overflow-hidden bg-stone-900">
          <ResponsiveImage
            src={vendor.coverImageUrl || `/images/vendors/${vendor.slug}.jpg`}
            alt={vendor.name}
            crop="21x9"
            priority
            className="h-full w-full object-cover tf-photo-warm"
          />
          {/* Dark gradient edge overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-transparent to-transparent" />

          {/* Overlaid Hero Content */}
          <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12 text-white flex flex-col md:flex-row md:items-end justify-between gap-6 z-10">
            <div className="space-y-3.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5 text-[13px] font-bold">
                {vendor.isOpen ? (
                  <span className="rounded-full bg-emerald-800 px-3 py-1 text-white shadow-xs">
                    Open Now
                  </span>
                ) : (
                  <span className="rounded-full bg-stone-800 px-3 py-1 text-white">
                    Opens at {hours?.open || '10:00'} IST
                  </span>
                )}
                {vendor.nightSafe && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#830020] px-3 py-1 text-white shadow-xs">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#FFB400]" />
                    <span>Campus Night Safety Certified</span>
                  </span>
                )}
                <span className="rounded-full bg-white/20 px-3 py-1 text-white backdrop-blur-xs">
                  Zero Delivery Fee Always
                </span>
              </div>

              <h1 className="font-display text-[44px] lg:text-[50px] font-bold tracking-tight text-white leading-tight">
                {vendor.name}
              </h1>

              {vendor.tagline && (
                <p className="text-[17px] text-stone-200 line-clamp-1 font-medium">
                  {vendor.tagline}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-[14px] text-stone-300 pt-1">
                {vendor.ratingAvg > 0 && (
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <Star className="h-4 w-4 fill-[#FFB400] text-[#FFB400]" />
                    <span>{vendor.ratingAvg.toFixed(1)}</span>
                    <span className="text-stone-300">({vendor.ratingCount} reviews)</span>
                  </div>
                )}
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>~{vendor.prepMinutes + 10}m gate drop</span>
                </div>
                <span>•</span>
                <div>{rupeeMin > 0 ? `Min order ₹${rupeeMin}` : 'No minimum order'}</div>
                <span>•</span>
                <div>
                  Hours: {hours?.open || '10:00'} – {hours?.close || '22:00'} IST
                </div>
              </div>
            </div>

            {/* Pure Veg Toggle Switch */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => setVegOnly(!vegOnly)}
                className={`flex items-center gap-2 rounded-full border px-5 py-2.5 text-[14px] font-bold transition-all duration-150 cursor-pointer shadow-md ${
                  vegOnly
                    ? 'border-emerald-500 bg-emerald-600 text-white shadow-emerald-900/30'
                    : 'border-white/30 bg-black/50 text-white backdrop-blur-md hover:bg-black/70'
                }`}
              >
                <Leaf className="h-4 w-4 text-emerald-400" />
                <span>Pure Veg Menu Only</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3-COLUMN EDITORIAL STOREFRONT LAYOUT */}
      <div className="flex items-start gap-8 pt-4">
        {/* LEFT COLUMN: Sticky Menu Category Nav (Scroll-Spy) */}
        <aside
          aria-label="Menu category navigation"
          className="w-56 shrink-0 sticky top-24 self-start space-y-2 hidden md:block"
        >
          <div className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] px-3 py-1">
            Menu Categories
          </div>
          <nav className="space-y-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleScrollToCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[12px] text-left text-[14px] font-bold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#830020] text-white shadow-xs'
                      : 'text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] hover:text-[#830020]'
                  }`}
                >
                  <span className="truncate pr-2">{cat.name}</span>
                  <span
                    className={`text-[13px] font-semibold ${
                      isActive ? 'text-white/80' : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    {cat.items.length}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* MIDDLE COLUMN: 2-Column Responsive Menu Grid */}
        <div className="flex-1 min-w-0 space-y-14">
          {categories.map((cat) => (
            <section key={cat.id} id={`cat-${cat.id}`} className="space-y-6">
              <div className="border-b border-[var(--color-border)] pb-3">
                <h2 className="font-display text-[26px] font-bold text-[var(--color-text)]">
                  {cat.name}
                </h2>
                <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">
                  {cat.items.length} dishes freshly prepared by {vendor.name}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {cat.items.map((item) => {
                  const qty = getItemCartQuantity(item.id);
                  const rupeePrice = `₹${Math.round(item.pricePaise / 100)}`;
                  const hasCustomizations =
                    (item.variants && item.variants.length > 0) ||
                    (item.addons && item.addons.length > 0);

                  return (
                    <article
                      key={item.id}
                      className="group flex gap-4 p-4 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs hover:shadow-[var(--elevation-2)] hover:border-[#830020] transition-all duration-200"
                    >
                      {/* 160px Image */}
                      <div className="relative h-[160px] w-[160px] shrink-0 rounded-[14px] overflow-hidden bg-stone-100 border border-[var(--color-border-subtle)]">
                        <ResponsiveImage
                          src={item.imageUrl}
                          alt={item.name}
                          crop="1x1"
                          width={160}
                          height={160}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {!item.inStock && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white text-[13px] font-bold">
                            Sold Out
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                        <div className="space-y-1.5">
                          {/* Square FSSAI Veg / Non-Veg Marker */}
                          <div className="flex items-center gap-2">
                            <span
                              role="img"
                              aria-label={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                              className={`inline-flex items-center justify-center h-4 w-4 rounded border ${
                                item.isVeg
                                  ? 'border-emerald-600 bg-white'
                                  : 'border-red-600 bg-white'
                              }`}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  item.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                                }`}
                              />
                            </span>
                            <span className="text-[13px] font-semibold text-[var(--color-text-muted)]">
                              {item.isVeg ? 'Pure Veg' : 'Non-Veg'}
                            </span>
                          </div>

                          <h3 className="font-display text-[17px] font-bold text-[var(--color-text)] leading-snug">
                            {item.name}
                          </h3>

                          {item.description && (
                            <p className="text-[14px] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Price & Add / Stepper */}
                        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)] mt-2">
                          <span className="text-[18px] font-extrabold text-[var(--color-text)]">
                            {rupeePrice}
                          </span>

                          <div>
                            {qty === 0 ? (
                              <button
                                type="button"
                                disabled={!item.inStock}
                                onClick={() => handleAddItem(item)}
                                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#830020] text-white px-5 py-2 text-[14px] font-bold hover:bg-[#680019] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
                              >
                                <Plus className="h-4 w-4" />
                                <span>{hasCustomizations ? 'Customise' : 'Add'}</span>
                              </button>
                            ) : (
                              <QuantityStepper
                                quantity={qty}
                                onIncrease={() => handleAddItem(item)}
                                onDecrease={() => handleDecreaseItem(item)}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* RIGHT COLUMN: Sticky 360px Bill Panel (Slides in only after 1st item is added) */}
        {hasCartItems && (
          <aside
            aria-label="Order Bill Summary"
            className="w-[360px] shrink-0 sticky top-24 self-start animate-slide-in-right hidden xl:block"
          >
            <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--elevation-3)] p-6 space-y-6">
              {/* Header: Untruncated Vendor Name */}
              <div className="border-b border-[var(--color-border)] pb-4 space-y-1">
                <div className="text-[13px] font-bold uppercase tracking-wider text-[#830020] dark:text-[#FFB400]">
                  Your Campus Packet
                </div>
                <h3 className="font-display text-[20px] font-bold text-[var(--color-text)] leading-snug break-words">
                  {vendor.name}
                </h3>
                <div className="flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)] pt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-stone-500" />
                  <span>Delivering to chosen gate</span>
                </div>
              </div>

              {/* Itemized Lines */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                {currentVendorItems.map((item) => {
                  const linePrice = Math.round((item.pricePaise * item.quantity) / 100);
                  const key = item.lineKey || item.itemId;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between text-[14px] text-[var(--color-text)] gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{item.name}</div>
                        {item.variantLabel && (
                          <div className="text-[13px] text-[var(--color-text-muted)] truncate">
                            {item.variantLabel}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <QuantityStepper
                          quantity={item.quantity}
                          onIncrease={() => updateQuantity(key, item.quantity + 1)}
                          onDecrease={() => updateQuantity(key, item.quantity - 1)}
                        />
                        <span className="font-bold w-12 text-right">₹{linePrice}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-[var(--color-border)] pt-4 space-y-2 text-[14px]">
                <div className="flex justify-between text-[var(--color-text-muted)]">
                  <span>Item Subtotal</span>
                  <span className="font-semibold text-[var(--color-text)]">
                    ₹{Math.round(subtotalPaise / 100)}
                  </span>
                </div>
                <div className="flex justify-between text-[var(--color-text-muted)]">
                  <span>Packet Packaging</span>
                  <span className="font-semibold text-[var(--color-text)]">
                    ₹{Math.round(packingPaise / 100)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-800 dark:text-emerald-400 font-bold">
                  <span>Campus Delivery Fee</span>
                  <span>FREE</span>
                </div>

                <div className="border-t border-[var(--color-border)] pt-3 flex justify-between items-baseline text-[18px] font-bold text-[var(--color-text)]">
                  <span>Total Amount</span>
                  <span className="text-[22px] font-black text-[#830020] dark:text-[#FFB400]">
                    ₹{Math.round(totalPaise / 100)}
                  </span>
                </div>
              </div>

              {/* Direct Checkout Navigation (NO DUPLICATE MODAL) */}
              <button
                type="button"
                onClick={() => navigate('/checkout')}
                className="w-full min-h-[52px] rounded-full bg-[#FFB400] text-stone-950 font-display text-[16px] font-extrabold shadow-md hover:bg-[#E5A200] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#830020]"
              >
                <span>Proceed to Pay at Gate</span>
                <ArrowRight className="h-5 w-5" />
              </button>

              <div className="text-center text-[13px] text-[var(--color-text-muted)]">
                Pay ₹{Math.round(totalPaise / 100)} at gate drop after verifying 4-digit code.
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Item Customizer Modal */}
      {sheetItem && (
        <ItemOptionsSheet
          item={sheetItem}
          vendorCategory={vendor.category}
          open={Boolean(sheetItem)}
          onClose={() => setSheetItem(null)}
          onConfirmAdd={(selection: ItemOptionsSelection) => handleSheetConfirm(sheetItem, selection)}
        />
      )}

      {/* Switch Vendor Alert Dialog */}
      {pendingVendorSwitch && (
        <DialogV2
          open={Boolean(pendingVendorSwitch)}
          onClose={cancelVendorSwitch}
          title="Reset Bag for New Kitchen?"
        >
          <div className="space-y-4">
            <p className="text-[15px] text-[var(--color-text-muted)]">
              Your bag already contains dishes from <strong>{currentCartVendor?.name}</strong>. Adding items from{' '}
              <strong>{pendingVendorSwitch.vendor.name}</strong> will discard your previous packet.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelVendorSwitch}
                className="px-5 py-2.5 rounded-full border border-[var(--color-border)] text-[14px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] cursor-pointer"
              >
                Keep Current Bag
              </button>
              <button
                type="button"
                onClick={confirmVendorSwitch}
                className="px-5 py-2.5 rounded-full bg-[#830020] text-white text-[14px] font-bold hover:bg-[#680019] cursor-pointer"
              >
                Start New Bag
              </button>
            </div>
          </div>
        </DialogV2>
      )}
    </div>
  );
}

export default DesktopVendorPage;
