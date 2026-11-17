import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart, buildCartLineKey } from '../../../context/CartContext';
import { ResponsiveImage } from '../../../components/ui/ResponsiveImage';
import { MobileMenuItem } from '../../../components/v2/MenuItem/MobileMenuItem';
import { MobileCardSkeleton } from '../../../components/v2/Skeleton/Skeleton';
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

export function MobileVendorPage() {
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
    return vendor.categories.map((cat) => ({
      ...cat,
      items: vegOnly ? cat.items.filter((i) => i.isVeg) : cat.items,
    })).filter((cat) => cat.items.length > 0);
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
      <div className="space-y-4 pb-12 animate-pulse">
        <div className="h-8 w-24 rounded-lg bg-stone-200 dark:bg-stone-800" />
        <div className="aspect-[16/9] w-full rounded-[16px] bg-stone-200 dark:bg-stone-800" />
        <div className="space-y-3">
          <MobileCardSkeleton />
          <MobileCardSkeleton />
          <MobileCardSkeleton />
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <EmptyStateV2
        icon={<UtensilsCrossed className="h-8 w-8" />}
        title="Vendor Not Found"
        description="We could not find this campus canteen or store. It may have been closed or suspended."
        actionLabel="Return to Counters"
        onAction={() => navigate('/app')}
      />
    );
  }

  const hours = vendor.hoursJson ? JSON.parse(vendor.hoursJson) : null;
  const rupeeMin = Math.round((vendor.minOrderPaise ?? 0) / 100);

  return (
    <div className="space-y-4 pb-16">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="flex min-h-[44px] min-w-[44px] items-center gap-1 text-[14px] font-bold text-[var(--color-text)] active:opacity-75"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Counters</span>
        </button>

        {/* Veg Only Toggle */}
        <button
          type="button"
          onClick={() => setVegOnly(!vegOnly)}
          className={`flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-bold transition-colors ${
            vegOnly
              ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
          }`}
        >
          <Leaf className="h-3.5 w-3.5 text-emerald-600" />
          <span>Pure Veg</span>
        </button>
      </div>

      {/* Vendor Cover Hero Banner */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] shadow-xs">
        <ResponsiveImage
          src={vendor.coverImageUrl || `/images/vendors/${vendor.slug}.jpg`}
          alt={vendor.name}
          crop="4x3"
          priority
          className="h-full w-full object-cover tf-photo-warm"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <div className="flex items-center gap-2 text-[12px] font-bold">
            {vendor.isOpen ? (
              <span className="rounded-full bg-emerald-800 px-2 py-0.5 text-white">Open Now</span>
            ) : (
              <span className="rounded-full bg-stone-700 px-2 py-0.5 text-white">Opens {hours?.open || '10:00'}</span>
            )}
            {vendor.nightSafe && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#830020] px-2 py-0.5 text-white">
                <ShieldCheck className="h-3 w-3" />
                <span>Night Safe</span>
              </span>
            )}
          </div>
          <h1 className="font-display text-[24px] font-bold text-white mt-1 leading-tight">
            {vendor.name}
          </h1>
        </div>
      </div>

      {/* Metadata strip */}
      <div className="flex flex-wrap items-center gap-3 text-[13px] text-[var(--color-text-muted)] px-1">
        {vendor.ratingAvg > 0 && (
          <div className="flex items-center gap-1 font-bold text-[var(--color-text)]">
            <Star className="h-3.5 w-3.5 fill-[#FFB400] text-[#FFB400]" />
            <span>{vendor.ratingAvg.toFixed(1)}</span>
            <span>({vendor.ratingCount})</span>
          </div>
        )}
        <span>•</span>
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span>{vendor.prepMinutes + 10}m gate drop</span>
        </div>
        <span>•</span>
        <div>{rupeeMin > 0 ? `Min ₹${rupeeMin}` : 'No min order'}</div>
      </div>

      {/* Sticky Category Anchors Bar */}
      {categories.length > 1 && (
        <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-[var(--color-canvas-paper)]/95 backdrop-blur-md border-b border-[var(--color-border-subtle)] flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                const el = document.getElementById(`cat-${cat.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`min-h-[44px] shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors ${
                activeCategory === cat.id
                  ? 'bg-[#830020] text-white'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              {cat.name} ({cat.items.length})
            </button>
          ))}
        </div>
      )}

      {/* Menu Categories List */}
      <div className="space-y-6 pt-2">
        {categories.map((cat) => (
          <section key={cat.id} id={`cat-${cat.id}`} className="space-y-3">
            <h2 className="font-display text-[18px] font-bold text-[var(--color-text)]">
              {cat.name}
            </h2>
            <div className="space-y-3">
              {cat.items.map((item) => {
                const qty = getItemCartQuantity(item.id);
                return (
                  <MobileMenuItem
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

      {/* Item Customizer Sheet */}
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
          title="Replace items in cart?"
        >
          <div className="space-y-4">
            <p className="text-[14px] text-[var(--color-text-muted)]">
              Your cart has items from <strong>{currentCartVendor?.name}</strong>. Ordering from{' '}
              <strong>{pendingVendorSwitch.vendor.name}</strong> will reset your current cart.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelVendorSwitch}
                className="flex-1 min-h-[44px] rounded-full border border-[var(--color-border)] py-2 text-[14px] font-bold text-[var(--color-text)]"
              >
                Keep Current
              </button>
              <button
                type="button"
                onClick={confirmVendorSwitch}
                className="flex-1 min-h-[44px] rounded-full bg-[#830020] text-white py-2 text-[14px] font-bold hover:bg-[#680019]"
              >
                Start New Cart
              </button>
            </div>
          </div>
        </DialogV2>
      )}
    </div>
  );
}

export default MobileVendorPage;
