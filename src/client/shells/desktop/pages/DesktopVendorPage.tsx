import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart, buildCartLineKey } from '../../../context/CartContext';
import { ResponsiveImage } from '../../../components/ui/ResponsiveImage';
import { DesktopMenuItem } from '../../../components/v2/MenuItem/DesktopMenuItem';
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
        <div className="aspect-[21/9] w-full rounded-[24px] bg-stone-200 dark:bg-stone-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

  return (
    <div className="space-y-10 pb-20">
      {/* Back button & Breadcrumb */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-2 text-[15px] font-bold text-[var(--color-text-muted)] hover:text-[#830020] dark:hover:text-[#FFB400] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>All NIT Patna Counters</span>
        </button>
      </div>

      {/* Editorial 21:9 Hero Cover Card */}
      <section className="relative overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--elevation-2)]">
        <div className="relative aspect-[21/9] w-full overflow-hidden bg-[var(--color-surface-sunken)]">
          <ResponsiveImage
            src={vendor.coverImageUrl || `/images/vendors/${vendor.slug}.jpg`}
            alt={vendor.name}
            crop="21x9"
            priority
            className="h-full w-full object-cover tf-photo-warm"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-transparent" />

          {/* Hero text overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10 text-white flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold">
                {vendor.isOpen ? (
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-white">
                    Open Now
                  </span>
                ) : (
                  <span className="rounded-full bg-stone-800 px-3 py-1 text-white">
                    Opens at {hours?.open || '10:00'}
                  </span>
                )}
                {vendor.nightSafe && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#830020] px-3 py-1 text-white">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Campus Night Safety Certified</span>
                  </span>
                )}
                <span className="rounded-full bg-white/20 px-3 py-1 text-white backdrop-blur-xs">
                  Zero Delivery Fee
                </span>
              </div>

              <h1 className="font-display text-[44px] font-bold tracking-tight text-white leading-tight">
                {vendor.name}
              </h1>

              {vendor.tagline && (
                <p className="text-[17px] text-stone-200 line-clamp-1">{vendor.tagline}</p>
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
                  <span>{vendor.prepMinutes + 10}m gate drop</span>
                </div>
                <span>•</span>
                <div>{rupeeMin > 0 ? `Min order ₹${rupeeMin}` : 'No minimum order'}</div>
                <span>•</span>
                <div>Hours: {hours?.open || '10:00'} – {hours?.close || '22:00'}</div>
              </div>
            </div>

            {/* Veg toggle switch */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => setVegOnly(!vegOnly)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-bold transition-all ${
                  vegOnly
                    ? 'border-emerald-500 bg-emerald-600 text-white shadow-md'
                    : 'border-white/30 bg-black/40 text-white backdrop-blur-md hover:bg-black/60'
                }`}
              >
                <Leaf className="h-4 w-4 text-emerald-400" />
                <span>Pure Veg Menu Only</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Section Sub-Nav */}
      {categories.length > 1 && (
        <nav
          aria-label="Menu categories"
          className="sticky top-20 z-20 py-3 px-6 bg-[var(--color-canvas-paper)]/95 backdrop-blur-md rounded-2xl border border-[var(--color-border)] shadow-xs flex items-center gap-3 overflow-x-auto no-scrollbar"
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                const el = document.getElementById(`cat-${cat.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`rounded-full px-4 py-2 text-[14px] font-bold transition-all shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-[#830020] text-white shadow-xs'
                  : 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] border border-[var(--color-border)]'
              }`}
            >
              {cat.name} ({cat.items.length})
            </button>
          ))}
        </nav>
      )}

      {/* Menu Categories with 2-Column Responsive Grid */}
      <div className="space-y-12">
        {categories.map((cat) => (
          <section key={cat.id} id={`cat-${cat.id}`} className="space-y-6">
            <div className="border-b border-[var(--color-border)] pb-2">
              <h2 className="font-display text-[26px] font-bold text-[var(--color-text)]">
                {cat.name}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cat.items.map((item) => {
                const qty = getItemCartQuantity(item.id);
                return (
                  <DesktopMenuItem
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    description={item.description}
                    pricePaise={item.pricePaise}
                    isVeg={item.isVeg}
                    inStock={item.inStock}
                    imageUrl={item.imageUrl}
                    quantity={qty}
                    onAdd={() => handleAddItem(item)}
                    onIncrease={() => handleAddItem(item)}
                    onDecrease={() => handleDecreaseItem(item)}
                    onOpenOptions={() => setSheetItem(item)}
                  />
                );
              })}
            </div>
          </section>
        ))}
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
          title="Reset Cart for New Counter?"
        >
          <div className="space-y-4">
            <p className="text-[15px] text-[var(--color-text-muted)]">
              Your bag already contains dishes from <strong>{currentCartVendor?.name}</strong>. Adding items from{' '}
              <strong>{pendingVendorSwitch.vendor.name}</strong> will discard your previous bag.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelVendorSwitch}
                className="px-5 py-2.5 rounded-full border border-[var(--color-border)] text-[14px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)]"
              >
                Keep Current Bag
              </button>
              <button
                type="button"
                onClick={confirmVendorSwitch}
                className="px-5 py-2.5 rounded-full bg-[#830020] text-white text-[14px] font-bold hover:bg-[#680019]"
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
