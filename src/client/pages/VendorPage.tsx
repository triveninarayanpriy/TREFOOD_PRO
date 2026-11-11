import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { trackFunnelEvent } from '../utils/analytics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCart, buildCartLineKey } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { MenuLineRow } from '../components/ui/MenuLineRow';
import { DesktopPacketSidebar } from '../components/app/DesktopPacketSidebar';
import { Skeleton, MenuItemSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { SeoHead } from '../components/seo/SeoHead';
import { useToast } from '../components/ui/Toast';
import {
  ItemOptionsSheet,
  type ItemOptionsSelection,
} from '../components/app/ItemOptionsSheet';
import { isNightSafetyActive } from '@shared/curfew';
import {
  Clock,
  Star,
  ShieldCheck,
  ArrowLeft,
  ShoppingBag,
  Heart,
  Phone,
  AlertTriangle,
  Leaf,
  CalendarClock,
  MessageSquare,
} from 'lucide-react';
import type { Gate } from '@shared/schemas';
import type { VendorDetail, EnrichedMenuItem } from '@shared/types';

const CartDrawer = lazy(() =>
  import('../components/cart/CartDrawer').then((m) => ({ default: m.CartDrawer }))
);

function getNextOpeningTimestamp(openTimeStr: string): number {
  const [hStr, mStr] = (openTimeStr || '09:00').split(':');
  const h = Number(hStr) || 9;
  const m = Number(mStr) || 0;
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return Math.floor(target.getTime() / 1000);
}

export function VendorPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreorderIntent = searchParams.get('preorder') === '1';
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const {
    vendor: currentCartVendor,
    items: cartItems,
    selectedGateId,
    itemCount,
    scheduledFor,
    setScheduledFor,
    addItem,
    updateQuantity,
    updateNotes,
    pendingVendorSwitch,
    confirmVendorSwitch,
    cancelVendorSwitch,
  } = useCart();

  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'reviews'>('menu');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [vegOnlyMenu, setVegOnlyMenu] = useState(false);
  const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(null);
  const [sheetItem, setSheetItem] = useState<EnrichedMenuItem | null>(null);

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

  useEffect(() => {
    if (vendor?.id) {
      trackFunnelEvent('view_menu', {
        gateId: selectedGateId,
        vendorId: vendor.id,
      });
    }
  }, [vendor?.id, selectedGateId]);

  const { data: favData } = useQuery<{ ok: boolean; vendorIds: string[] }>({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/favorites');
      if (!res.ok) return { ok: false, vendorIds: [] };
      return res.json();
    },
    enabled: Boolean(user),
  });

  const { data: gatesData } = useQuery<{ ok: boolean; gates: Gate[] }>({
    queryKey: ['gates'],
    queryFn: async () => {
      const res = await fetch('/api/gates');
      return res.json();
    },
    staleTime: 60000,
  });

  const currentGate = gatesData?.gates?.find((g) => g.id === selectedGateId) || gatesData?.gates?.[0] || null;

  const isFavorite = Boolean(vendor && favData?.vendorIds?.includes(vendor.id));

  const favMutation = useMutation({
    mutationFn: async (vId: string) => {
      const res = await fetch(`/api/favorites/${vId}`, {
        method: isFavorite ? 'DELETE' : 'POST',
      });
      if (!res.ok) throw new Error('Could not update favourite');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      showToast(isFavorite ? 'Removed from saved favourites' : 'Saved to favourites', 'success');
    },
  });

  const handleFavoriteToggle = () => {
    if (!vendor) return;
    if (!user) {
      navigate(`/signin?returnTo=${encodeURIComponent(`/vendor/${vendor.slug}`)}&reason=favorites`);
      return;
    }
    favMutation.mutate(vendor.id);
  };

  // Review rating breakdown computed dynamically
  const reviewBreakdown = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
    const list = vendor?.reviews || [];
    for (const r of list) {
      const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      counts[star] = (counts[star] || 0) + 1;
    }
    return counts;
  }, [vendor?.reviews]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-36 rounded-lg" />
        <Skeleton className="h-48 w-full rounded-2xl" />
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
          <Button onClick={() => navigate('/app')} variant="secondary" size="sm">
            Back to Campus Home
          </Button>
        </div>
      </div>
    );
  }

  const hours = vendor.hoursJson ? JSON.parse(vendor.hoursJson) : null;
  const openHourLabel = hours?.open || '09:00';
  const closeHourLabel = hours?.close || '22:00';
  const isBusy = vendor.busyUntil && vendor.busyUntil > Math.floor(Date.now() / 1000);
  const nightSafe = vendor.nightSafe !== false;
  const nightNow = isNightSafetyActive();
  const outOfStockCount =
    vendor.outOfStockCount ??
    vendor.categories.reduce(
      (sum, cat) => sum + cat.items.filter((i) => !i.inStock).length,
      0
    );

  const isCurrentVendorCart = currentCartVendor?.id === vendor.id;
  const vendorCartTotalPaise = isCurrentVendorCart
    ? cartItems.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0)
    : 0;

  const totalCategoryItems = vendor.categories?.map((cat) => ({
    ...cat,
    filteredItems: vegOnlyMenu ? cat.items.filter((i) => i.isVeg) : cat.items,
  })) || [];

  const handleQuickAddItem = (item: EnrichedMenuItem) => {
    const defaultVariant = item.variants?.[0];
    const effectivePrice = item.pricePaise + (defaultVariant?.priceDeltaPaise || 0);
    if (!vendor.isOpen && !scheduledFor) {
      setScheduledFor(getNextOpeningTimestamp(openHourLabel));
    }
    addItem(
      { id: vendor.id, name: vendor.name, slug: vendor.slug },
      {
        itemId: item.id,
        name: item.name,
        pricePaise: effectivePrice,
        isVeg: item.isVeg,
        variantId: defaultVariant?.id,
        variantLabel: defaultVariant?.label,
      }
    );
  };

  const handleSheetConfirm = (item: EnrichedMenuItem, selection: ItemOptionsSelection) => {
    if (!vendor.isOpen && !scheduledFor) {
      setScheduledFor(getNextOpeningTimestamp(openHourLabel));
    }
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
    showToast(`Added ${item.name} to packet`, 'success');
  };

  const phoneHref = vendor.phone ? `tel:${vendor.phone.replace(/\s+/g, '')}` : null;

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-5 pb-28 lg:pb-10 space-y-5">
      <SeoHead
        title={`${vendor.name} Menu | TreFood NIT Patna`}
        description={
          vendor.description ||
          `Order online from ${vendor.name} at NIT Patna with zero delivery fee and 4-digit gate handover verification.`
        }
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
        onClick={() => navigate('/app')}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>All Campus Canteens</span>
      </button>

      {/* Pre-order banner if opened for a closed vendor */}
      {(!vendor.isOpen || isPreorderIntent) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#FCD34D] bg-[#FFF8E1] px-4 py-3 text-xs text-[#78350F] dark:border-[#92400E] dark:bg-[#331F04] dark:text-[#FDE68A]">
          <div className="flex items-center gap-2 font-semibold">
            <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {!vendor.isOpen
                ? `Currently closed • Opens at ${openHourLabel} IST. Pre-order items now to reserve for the opening gate slot.`
                : `Pre-order mode enabled • Build your packet below for upcoming delivery.`}
            </span>
          </div>
          {!vendor.isOpen && (
            <button
              type="button"
              onClick={() => {
                setScheduledFor(getNextOpeningTimestamp(openHourLabel));
                showToast(`Pre-order slot set for opening at ${openHourLabel} IST`, 'success');
              }}
              className="min-h-[36px] rounded-xl bg-[#830020] px-3 text-xs font-bold text-white dark:bg-[#FFB400] dark:text-[#1C1917]"
            >
              {scheduledFor ? 'Slot Scheduled ✓' : `Schedule ${openHourLabel} IST`}
            </button>
          )}
        </div>
      )}

      {/* Two-Column Desktop Layout (Menu + Sticky Packet Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 min-w-0 space-y-5">
          {/* Vendor Profile Header Card with Real Cover Photo & Tagline */}
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
            <div className="relative aspect-[16/9] max-h-56 w-full overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
              <img
                src={vendor.coverImageUrl || `/images/vendors/${vendor.slug}.jpg`}
                alt={vendor.name}
                width={768}
                height={432}
                fetchPriority="high"
                className="h-full w-full object-cover tf-photo-warm"
              />
              {vendor.tagline && (
                <span className="absolute bottom-3 left-3 rounded-md bg-[#1C1210]/90 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-[#FBF6EE]">
                  {vendor.tagline}
                </span>
              )}
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text)]">
                      {vendor.name}
                    </h1>
                    {vendor.nameHi && (
                      <span className="text-sm font-medium text-[var(--color-text-muted)]">
                        ({vendor.nameHi})
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)]">
                    {vendor.cuisines && vendor.cuisines.length > 0
                      ? vendor.cuisines.join(' · ')
                      : vendor.category.replace('_', ' ')}
                    {' · '}NIT Patna
                    {(vendor.minOrderPaise ?? 0) > 0
                      ? ` · Min ₹${Math.round((vendor.minOrderPaise ?? 0) / 100)}`
                      : ' · No min order'}
                    {vendor.dineInAvailable ? ' · Dine-in available' : ''}
                  </p>
                  {vendor.description && (
                    <p className="mt-2 text-xs text-[var(--color-text-muted)] max-w-xl leading-relaxed">
                      {vendor.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    {phoneHref && (
                      <a
                        href={phoneHref}
                        aria-label={`Call ${vendor.name}`}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 text-xs font-bold text-[var(--color-text)] hover:border-[#830020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
                      >
                        <Phone className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
                        <span>Call</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={handleFavoriteToggle}
                      aria-label={isFavorite ? 'Remove from favourites' : 'Save to favourites'}
                      aria-pressed={isFavorite}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 text-xs font-bold text-[var(--color-text)] hover:border-[#830020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
                    >
                      <Heart
                        className={`h-4 w-4 ${isFavorite ? 'fill-[#830020] text-[#830020] dark:fill-[#FFB400] dark:text-[#FFB400]' : ''}`}
                        aria-hidden="true"
                      />
                      <span>{isFavorite ? 'Saved' : 'Save'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {!vendor.isOpen ? (
                      <Badge variant="closed">Closed · Opens {openHourLabel}</Badge>
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
              </div>

              {/* Info Grid: Hours, Prep Time, FSSAI */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[var(--color-border-subtle)] pt-4 text-xs text-[var(--color-text-muted)]">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    Hours: {openHourLabel} – {closeHourLabel} IST
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#830020] dark:text-[#FFB400] shrink-0" aria-hidden="true" />
                  <span>
                    Prep: ~{vendor.prepMinutes}
                    {vendor.prepMaxMinutes && vendor.prepMaxMinutes > vendor.prepMinutes
                      ? `–${vendor.prepMaxMinutes}`
                      : ''}{' '}
                    mins
                  </span>
                </div>

                {vendor.fssaiNo && (
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#15803D] shrink-0" aria-hidden="true" />
                    <span>FSSAI: {vendor.fssaiNo}</span>
                  </div>
                )}
              </div>

              {/* Quoted Campus Night Safety Notice */}
              {nightSafe && (
                <div className="flex items-start gap-2.5 rounded-xl border border-[#FCD34D] border-l-4 border-l-[#830020] bg-[#FFF9EE] px-3.5 py-2.5 text-xs font-semibold text-[#1C1210] dark:border-[#92400E] dark:border-l-[#FFB400] dark:bg-[#231914] dark:text-[#FBF6EE]">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
                  <span>
                    {vendor.nightSafetyNotice ||
                      (nightNow
                        ? 'Campus Night Safety Active: After 7:00 PM, deliveries are handled personally by the vendor owner, co-owner, or senior staff with complete trust to ensure campus premises safety.'
                        : 'Campus Night Safety Guarantee: After 7:00 PM, deliveries are handled personally by the vendor owner, co-owner, or senior staff with complete trust to ensure campus premises safety.')}
                  </span>
                </div>
              )}

              {/* Out-of-stock note when any item on menu is unavailable */}
              {outOfStockCount > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3.5 py-2.5 text-xs text-[var(--color-text-muted)]">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[#B45309] dark:text-[#FBBF24]" aria-hidden="true" />
                  <span>
                    <strong className="text-[var(--color-text)]">
                      {outOfStockCount} {outOfStockCount === 1 ? 'item' : 'items'} temporarily out of stock
                    </strong>{' '}
                    and marked sold out below until restocked by {vendor.name}.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Menu vs Reviews Primary Tabs */}
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5">
            <div role="tablist" aria-label="Vendor sections" className="flex items-center gap-1.5">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'menu'}
                onClick={() => setActiveTab('menu')}
                className={`min-h-[44px] rounded-xl px-4 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] ${
                  activeTab === 'menu'
                    ? 'bg-[#830020] text-white dark:bg-[#FFB400] dark:text-[#1C1917]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Menu ({vendor.categories.reduce((acc, c) => acc + c.items.length, 0)})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'reviews'}
                onClick={() => setActiveTab('reviews')}
                className={`min-h-[44px] rounded-xl px-4 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] ${
                  activeTab === 'reviews'
                    ? 'bg-[#830020] text-white dark:bg-[#FFB400] dark:text-[#1C1917]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Reviews ({vendor.reviews?.length ?? 0})
              </button>
            </div>

            {activeTab === 'menu' && (
              <button
                type="button"
                role="switch"
                aria-checked={vegOnlyMenu}
                onClick={() => setVegOnlyMenu((v) => !v)}
                className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] ${
                  vegOnlyMenu
                    ? 'border-[#15803D] bg-[#DCFCE7] text-[#14532D] dark:border-[#16A34A] dark:bg-[#052E16] dark:text-[#BBF7D0]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-text)]'
                }`}
              >
                <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Veg only</span>
              </button>
            )}
          </div>

          {activeTab === 'menu' ? (
            <>
              {/* Sticky Category Tabs */}
              <div
                tabIndex={0}
                role="region"
                aria-label="Menu categories"
                className="sticky top-[65px] z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2.5 bg-[var(--color-surface-sunken)] border-y border-[var(--color-border)] flex items-center gap-2 overflow-x-auto no-scrollbar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
              >
                {totalCategoryItems.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    disabled={cat.filteredItems.length === 0}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`min-h-[44px] whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] disabled:cursor-not-allowed ${
                      cat.filteredItems.length === 0
                        ? 'border border-stone-300 bg-stone-100 text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400'
                        : activeCategory === cat.id
                        ? 'bg-[#830020] text-white shadow-xs dark:bg-[#FFB400] dark:text-[#1C1917]'
                        : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]'
                    }`}
                  >
                    {cat.name} ({cat.filteredItems.length})
                  </button>
                ))}
              </div>

              {/* Menu Sections */}
              <div className="space-y-8">
                {totalCategoryItems.every((c) => c.filteredItems.length === 0) ? (
                  <EmptyState
                    title="No veg items in this menu"
                    description="Switch off the Veg-only filter to view all dishes from this kitchen."
                    actionLabel="Show All Items"
                    onAction={() => setVegOnlyMenu(false)}
                  />
                ) : (
                  totalCategoryItems.map((cat) => {
                    if (cat.filteredItems.length === 0) return null;
                    return (
                      <section key={cat.id} id={`cat-${cat.id}`} className="space-y-3">
                        <h2 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
                          <span>{cat.name}</span>
                          <span className="text-xs font-normal text-[var(--color-text-muted)]">
                            ({cat.filteredItems.length})
                          </span>
                        </h2>

                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 shadow-[var(--shadow-card)]">
                          {cat.filteredItems.map((item) => {
                            const matchingCartLines = isCurrentVendorCart
                              ? cartItems.filter((ci) => ci.itemId === item.id)
                              : [];
                            const primaryCartLine = matchingCartLines[0];
                            const totalQtyInCart = matchingCartLines.reduce(
                              (sum, ci) => sum + ci.quantity,
                              0
                            );
                            const hasCustomisation = Boolean(
                              (item.variants && item.variants.length > 0) ||
                                (item.addons && item.addons.length > 0)
                            );

                            return (
                              <div key={item.id} className="border-b border-[var(--color-border-subtle)] last:border-b-0">
                                <MenuLineRow
                                  name={item.name}
                                  description={item.description}
                                  pricePaise={item.pricePaise}
                                  packingChargePaise={item.packingChargePaise}
                                  isVeg={item.isVeg}
                                  inStock={item.inStock}
                                  hasCustomisation={hasCustomisation}
                                  imageUrl={item.imageUrl}
                                  quantity={totalQtyInCart}
                                  notes={primaryCartLine?.notes}
                                  onAddNote={
                                    primaryCartLine
                                      ? () =>
                                          setEditingNoteItemId(
                                            primaryCartLine.lineKey || primaryCartLine.itemId
                                          )
                                      : undefined
                                  }
                                  onOpenOptions={() => setSheetItem(item)}
                                  onAdd={() => handleQuickAddItem(item)}
                                  onIncrease={() =>
                                    primaryCartLine
                                      ? updateQuantity(
                                          primaryCartLine.lineKey || primaryCartLine.itemId,
                                          primaryCartLine.quantity + 1
                                        )
                                      : handleQuickAddItem(item)
                                  }
                                  onDecrease={() =>
                                    primaryCartLine
                                      ? updateQuantity(
                                          primaryCartLine.lineKey || primaryCartLine.itemId,
                                          primaryCartLine.quantity - 1
                                        )
                                      : undefined
                                  }
                                />

                                {primaryCartLine &&
                                  editingNoteItemId ===
                                    (primaryCartLine.lineKey || primaryCartLine.itemId) && (
                                    <div className="flex items-center gap-2 pb-3 pl-4">
                                      <input
                                        type="text"
                                        maxLength={80}
                                        placeholder="e.g. less spicy (max 80 chars)"
                                        defaultValue={primaryCartLine.notes || ''}
                                        onBlur={(e) => {
                                          updateNotes(
                                            primaryCartLine.lineKey || primaryCartLine.itemId,
                                            e.target.value
                                          );
                                          setEditingNoteItemId(null);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            updateNotes(
                                              primaryCartLine.lineKey || primaryCartLine.itemId,
                                              (e.target as HTMLInputElement).value
                                            );
                                            setEditingNoteItemId(null);
                                          }
                                        }}
                                        autoFocus
                                        className="h-9 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 text-xs text-[var(--color-text)]"
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
                  })
                )}
              </div>
            </>
          ) : (
            /* Reviews Tab with Rating Summary & Verified Feedback */
            <section aria-label="Vendor Reviews" className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
                <div className="sm:col-span-5 flex flex-col justify-center items-start sm:border-r sm:border-[var(--color-border-subtle)] sm:pr-4 space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Student Rating Summary
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-[var(--color-text)]">
                      {vendor.ratingAvg.toFixed(1)}
                    </span>
                    <span className="text-xs font-semibold text-[var(--color-text-muted)]">/ 5.0</span>
                  </div>
                  <div
                    role="img"
                    className="flex items-center gap-1"
                    aria-label={`Rated ${vendor.ratingAvg} out of 5`}
                  >
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= Math.round(vendor.ratingAvg)
                            ? 'fill-[#FFB400] text-[#FFB400]'
                            : 'text-[var(--color-border)]'
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Based on {vendor.ratingCount} completed campus handovers (sample data)
                  </p>
                </div>

                <div className="sm:col-span-7 space-y-2 justify-center flex flex-col">
                  {([5, 4, 3, 2, 1] as const).map((star) => {
                    const totalReviews = vendor.reviews?.length || 0;
                    const count = reviewBreakdown[star] || 0;
                    const pct =
                      totalReviews > 0
                        ? Math.round((count / totalReviews) * 100)
                        : star === 5
                        ? 75
                        : star === 4
                        ? 20
                        : 5;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-8 font-mono font-bold text-[var(--color-text)]">
                          {star} / 5
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
                          <div
                            className="h-full rounded-full bg-[#FFB400]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right font-mono text-[11px] text-[var(--color-text-muted)]">
                          {totalReviews > 0 ? count : `${pct}%`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {vendor.reviews && vendor.reviews.length > 0 ? (
                <div className="space-y-3">
                  {vendor.reviews.map((rev) => (
                    <article
                      key={rev.id}
                      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[var(--color-text)]">
                          {rev.reviewerName || 'NITP Student'}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFFBEB] px-2 py-0.5 text-xs font-bold text-[#78350F] dark:bg-[#3B2406] dark:text-[#FDE68A]">
                          <Star className="h-3 w-3 fill-[#FFB400] text-[#FFB400]" aria-hidden="true" />
                          <span>{rev.rating}.0</span>
                        </span>
                      </div>
                      {rev.comment && (
                        <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                          {rev.comment}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<MessageSquare className="h-7 w-7 text-[var(--color-text-muted)]" />}
                  title="No written reviews yet"
                  description={`Students rated ${vendor.name} ${vendor.ratingAvg.toFixed(1)} out of 5 across ${vendor.ratingCount} orders. Written comments appear here once submitted on delivered tickets.`}
                  actionLabel="Back to Menu"
                  onAction={() => setActiveTab('menu')}
                />
              )}
            </section>
          )}
        </div>

        {/* Sticky Desktop PaperBill Summary Column */}
        <DesktopPacketSidebar
          currentGate={currentGate}
          favoritesCount={favData?.vendorIds?.length || 0}
        />
      </div>

      {/* Floating Cart Bar on Mobile/Tablet (< lg) */}
      {itemCount > 0 && (
        <div className="fixed bottom-16 left-4 right-4 z-30 md:bottom-6 lg:hidden">
          <div className="mx-auto max-w-md">
            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="flex w-full min-h-[56px] items-center justify-between rounded-2xl bg-[#830020] p-4 text-white shadow-xl transition-transform hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] dark:bg-[#FFB400] dark:text-[#1C1210]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 dark:bg-[#1C1210]/15 font-mono font-bold text-sm">
                  {itemCount}
                </div>
                <div className="text-left">
                  <div className="text-xs uppercase tracking-wide opacity-90">
                    {currentCartVendor?.name}
                  </div>
                  <div className="text-sm font-bold">
                    View Packet · ₹{(vendorCartTotalPaise / 100).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold bg-white/20 dark:bg-[#1C1210]/15 px-3 py-1.5 rounded-xl">
                <span>Open Cart</span>
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Item Options Sheet (Variants + Add-ons) */}
      <ItemOptionsSheet
        item={sheetItem}
        vendorCategory={vendor.category}
        open={Boolean(sheetItem)}
        onClose={() => setSheetItem(null)}
        onConfirmAdd={(sel) => sheetItem && handleSheetConfirm(sheetItem, sel)}
      />

      {/* Lazy Cart Drawer */}
      {cartDrawerOpen && (
        <Suspense fallback={null}>
          <CartDrawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
        </Suspense>
      )}

      {/* Vendor Switch Confirmation Dialog */}
      <Dialog
        open={!!pendingVendorSwitch}
        onClose={cancelVendorSwitch}
        title={`Start a new cart with ${pendingVendorSwitch?.vendor.name || 'this vendor'}?`}
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
            Clear &amp; switch vendor
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
