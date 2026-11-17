import { useState, useMemo, useEffect } from 'react';
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
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll listener for collapsing header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 90);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Scroll-spy observer for sticky category chips
  useEffect(() => {
    if (categories.length === 0) return;
    if (!activeCategory && categories[0]) {
      setActiveCategory(categories[0].id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const catId = entry.target.id.replace('cat-', '');
            setActiveCategory(catId);
          }
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0.1 }
    );

    categories.forEach((cat) => {
      const el = document.getElementById(`cat-${cat.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [categories, activeCategory]);

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

  const handleScrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    const el = document.getElementById(`cat-${catId}`);
    if (el) {
      const topOffset = 110;
      const elementPosition = el.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - topOffset,
        behavior: 'smooth',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 pb-12 animate-pulse pt-2">
        <div className="h-8 w-24 rounded-lg bg-stone-200 dark:bg-stone-800" />
        <div className="aspect-[16/9] w-full rounded-[16px] bg-stone-200 dark:bg-stone-800" />
        <div className="space-y-3 pt-4">
          <MobileCardSkeleton />
          <MobileCardSkeleton />
          <MobileCardSkeleton />
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="pt-6">
        <EmptyStateV2
          icon={<UtensilsCrossed className="h-8 w-8" />}
          title="Vendor Not Found"
          description="We could not find this campus canteen or store. It may have been closed or suspended."
          actionLabel="Return to Counters"
          onAction={() => navigate('/app')}
        />
      </div>
    );
  }

  const hours = vendor.hoursJson ? JSON.parse(vendor.hoursJson) : null;
  const rupeeMin = Math.round((vendor.minOrderPaise ?? 0) / 100);

  return (
    <div className="space-y-4 pb-24">
      {/* 1. COLLAPSING HEADER: Shrinks to slim title bar on scroll */}
      <header
        className={`sticky top-0 z-30 -mx-4 px-4 flex h-14 items-center justify-between transition-all duration-200 ${
          isScrolled
            ? 'border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md shadow-xs'
            : 'bg-[var(--color-canvas-paper)]'
        }`}
      >
        <button
          type="button"
          onClick={() => navigate('/app')}
          aria-label="Back to campus kitchens"
          className="flex min-h-[44px] min-w-[44px] items-center gap-1 text-[14px] font-bold text-[var(--color-text)] active:scale-95 transition-transform cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-[#830020] dark:text-[#FFB400]" />
          <span className={isScrolled ? 'sr-only' : 'inline'}>Counters</span>
        </button>

        {/* Scrolled Title in Slim Bar */}
        {isScrolled && (
          <div className="min-w-0 flex-1 px-2 text-center animate-in fade-in duration-150">
            <h1 className="font-display text-[16px] font-bold text-[var(--color-text)] truncate">
              {vendor.name}
            </h1>
          </div>
        )}

        {/* Pure Veg Toggle Switch */}
        <button
          type="button"
          onClick={() => setVegOnly(!vegOnly)}
          className={`flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-bold transition-all cursor-pointer active:scale-95 shrink-0 ${
            vegOnly
              ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
          }`}
        >
          <Leaf className="h-3.5 w-3.5 text-emerald-600" />
          <span>Veg only</span>
        </button>
      </header>

      {/* 2. Full Cover Image Banner (Visible when not fully scrolled) */}
      <section aria-label="Vendor Information" className="space-y-3">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-stone-900 shadow-xs">
          <ResponsiveImage
            src={vendor.coverImageUrl || `/images/vendors/${vendor.slug}.jpg`}
            alt={vendor.name}
            crop="4x3"
            priority
            className="h-full w-full object-cover tf-photo-warm"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent" />

          {/* Badges on Top */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            {vendor.isOpen ? (
              <span className="rounded-full bg-emerald-800 px-2.5 py-0.5 text-[12px] font-bold text-white shadow-xs">
                Open Now
              </span>
            ) : (
              <span className="rounded-full bg-stone-800 px-2.5 py-0.5 text-[12px] font-bold text-white shadow-xs">
                Opens {hours?.open || '10:00'} IST
              </span>
            )}

            {vendor.nightSafe && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#830020] px-2.5 py-0.5 text-[12px] font-bold text-white shadow-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Night Safe</span>
              </span>
            )}
          </div>

          {/* Title on Bottom of Image */}
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <h1 className="font-display text-[22px] font-bold text-white leading-tight">
              {vendor.name}
            </h1>
            <p className="text-[13px] text-stone-300 truncate mt-0.5">
              {vendor.tagline || 'Freshly prepared at NIT Patna counter'}
            </p>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-[var(--color-text-muted)] px-1">
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
            <span>{vendor.prepMinutes + 10}m to gate</span>
          </div>
          <span>•</span>
          <div>{rupeeMin > 0 ? `Min ₹${rupeeMin}` : 'Zero min order'}</div>
        </div>
      </section>

      {/* 3. STICKY HORIZONTAL CATEGORY CHIPS WITH SCROLL-SPY */}
      {categories.length > 0 && (
        <nav
          aria-label="Menu Categories"
          className="sticky top-14 z-20 -mx-4 px-3 py-2 bg-[var(--color-surface)]/95 backdrop-blur-md border-y border-[var(--color-border)] flex gap-2 overflow-x-auto no-scrollbar snap-x"
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleScrollToCategory(cat.id)}
                className={`min-h-[44px] shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-all cursor-pointer snap-start active:scale-95 ${
                  isActive
                    ? 'bg-[#830020] text-white shadow-xs'
                    : 'bg-[var(--color-surface-sunken)] border border-[var(--color-border)] text-[var(--color-text)] hover:border-[#830020]'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`ml-1.5 text-[11px] ${isActive ? 'text-white/80' : 'text-[var(--color-text-muted)]'}`}>
                  ({cat.items.length})
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* 4. MENU ITEMS AS ROWS (88px photo on the right, name and price on the left, clear Add button) */}
      <div className="space-y-6 pt-1">
        {categories.map((cat) => (
          <section key={cat.id} id={`cat-${cat.id}`} className="space-y-3">
            <div className="border-b border-[var(--color-border-subtle)] pb-1.5">
              <h2 className="font-display text-[18px] font-bold text-[var(--color-text)]">
                {cat.name}
              </h2>
            </div>

            <div className="space-y-3">
              {cat.items.map((item) => {
                const qty = getItemCartQuantity(item.id);
                const hasOptions =
                  (item.variants && item.variants.length > 0) ||
                  (item.addons && item.addons.length > 0);
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
                    onOpenOptions={hasOptions ? () => setSheetItem(item) : undefined}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* 5. ITEM CUSTOMISATION AS BOTTOM SHEET WITH LARGE TOUCH TARGETS */}
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
              Your cart currently contains items from <strong>{currentCartVendor?.name}</strong>. Ordering from{' '}
              <strong>{pendingVendorSwitch.vendor.name}</strong> will reset your current cart.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelVendorSwitch}
                className="flex-1 min-h-[44px] rounded-full border border-[var(--color-border)] py-2 text-[14px] font-bold text-[var(--color-text)] active:scale-95 transition-transform"
              >
                Keep Current
              </button>
              <button
                type="button"
                onClick={confirmVendorSwitch}
                className="flex-1 min-h-[44px] rounded-full bg-[#830020] text-white py-2 text-[14px] font-bold hover:bg-[#680019] active:scale-95 transition-transform"
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
