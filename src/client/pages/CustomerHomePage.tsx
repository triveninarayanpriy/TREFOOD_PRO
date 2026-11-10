import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Chip, Badge } from '../components/ui/Badge';
import { VendorCard, getVendorImageUrl } from '../components/ui/VendorCard';
import { VendorCardSkeleton, Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { GatePicker } from '../components/ui/GatePicker';
import { CurfewBanner } from '../components/ui/CurfewBanner';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { SeoHead } from '../components/seo/SeoHead';
import { useToast } from '../components/ui/Toast';
import { AppSearchBar } from '../components/app/AppSearchBar';
import { PromotionCarousel } from '../components/app/PromotionCarousel';
import { DesktopPacketSidebar } from '../components/app/DesktopPacketSidebar';
import { getGateCurfewStatus, isNightSafetyActive } from '@shared/curfew';
import {
  computeCategoryChips,
  sortCustomerVendors,
  partitionCustomerVendors,
  type CustomerSortOption,
} from '@shared/catalogFilters';
import {
  MapPin,
  ShieldCheck,
  Leaf,
  Flame,
  TrendingUp,
  ShoppingBag,
  Plus,
} from 'lucide-react';
import type { Gate } from '@shared/schemas';
import type { VendorSummary, QuickPickItem, CouponSummary } from '@shared/types';

const CartDrawer = lazy(() =>
  import('../components/cart/CartDrawer').then((m) => ({ default: m.CartDrawer }))
);

const NOTIFY_STORAGE_KEY = 'trefood_notify_vendors';

export function CustomerHomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    selectedGateId,
    setSelectedGateId,
    vendor: cartVendor,
    items: cartItems,
    itemCount,
    addItem,
    pendingVendorSwitch,
    confirmVendorSwitch,
    cancelVendorSwitch,
    quote,
  } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [gatePickerOpen, setGatePickerOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || 'all'
  );
  const [vegOnly, setVegOnly] = useState<boolean>(
    searchParams.get('veg') === 'true' || searchParams.get('veg') === '1'
  );
  const [sortBy, setSortBy] = useState<CustomerSortOption>('eta');
  const [notifiedVendorIds, setNotifiedVendorIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(NOTIFY_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  // Fetch favourites when signed in
  const { data: favData } = useQuery<{ ok: boolean; vendorIds: string[] }>({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/favorites');
      if (!res.ok) return { ok: false, vendorIds: [] };
      return res.json();
    },
    enabled: Boolean(user),
  });

  const favMutation = useMutation({
    mutationFn: async ({ vendorId, isFav }: { vendorId: string; isFav: boolean }) => {
      const res = await fetch(`/api/favorites/${vendorId}`, {
        method: isFav ? 'DELETE' : 'POST',
      });
      if (!res.ok) throw new Error('Failed updating favourite');
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      showToast(vars.isFav ? 'Removed from favourites' : 'Saved to favourites', 'success');
    },
  });

  const handleToggleFavorite = (vendorId: string) => {
    if (!user) {
      navigate(
        `/signin?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}&reason=favorites`
      );
      return;
    }
    const isFav = Boolean(favData?.vendorIds?.includes(vendorId));
    favMutation.mutate({ vendorId, isFav });
  };

  const handleNotifyToggle = (v: VendorSummary) => {
    const already = notifiedVendorIds.includes(v.id);
    const next = already
      ? notifiedVendorIds.filter((id) => id !== v.id)
      : [...notifiedVendorIds, v.id];
    setNotifiedVendorIds(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(NOTIFY_STORAGE_KEY, JSON.stringify(next));
    }
    showToast(
      already
        ? `Removed opening reminder for ${v.name}.`
        : `Reminder set! We will alert you when ${v.name} opens for your gate.`,
      'success'
    );
  };

  const { data: gatesData, isLoading: gatesLoading } = useQuery<{ gates: Gate[] }>({
    queryKey: ['gates'],
    queryFn: async () => {
      const res = await fetch('/api/gates');
      if (!res.ok) throw new Error('Failed to load gates');
      return res.json();
    },
    staleTime: 60000,
  });

  const currentGate = gatesData?.gates?.find((g) => g.id === selectedGateId) || null;
  const gateStatus = currentGate ? getGateCurfewStatus(currentGate) : null;
  const nightSafeNow = isNightSafetyActive();

  const {
    data: vendorsData,
    isLoading: vendorsLoading,
    error: vendorsError,
    refetch: refetchVendors,
  } = useQuery<{ ok: boolean; vendors: VendorSummary[]; quickPicks?: QuickPickItem[] }>({
    queryKey: ['vendors', selectedGateId],
    queryFn: async () => {
      const res = await fetch(`/api/vendors?gateId=${encodeURIComponent(selectedGateId)}`);
      if (!res.ok) throw new Error('Failed to load campus vendors');
      return res.json();
    },
    staleTime: 30000,
  });

  const { data: couponsData, isLoading: couponsLoading } = useQuery<{
    ok: boolean;
    coupons: CouponSummary[];
  }>({
    queryKey: ['coupons'],
    queryFn: async () => {
      const res = await fetch('/api/coupons');
      if (!res.ok) return { ok: false, coupons: [] };
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: annData } = useQuery<{
    ok: boolean;
    announcements: Array<{ id: string; message: string }>;
  }>({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await fetch('/api/announcements');
      if (!res.ok) return { ok: false, announcements: [] };
      return res.json();
    },
    staleTime: 60000,
  });

  const rawVendors = vendorsData?.vendors || [];

  // Category chips with live counts & zero-result prevention
  const {
    categories: categoriesWithCounts,
    effectiveCategory,
    baseMatched,
  } = useMemo(
    () =>
      computeCategoryChips(rawVendors, {
        vegOnly,
        selectedCategory,
      }),
    [rawVendors, vegOnly, selectedCategory]
  );

  // Sync category URL / auto-reset when filter combination makes category empty
  useEffect(() => {
    if (effectiveCategory !== selectedCategory) {
      setSelectedCategory(effectiveCategory);
    }
  }, [effectiveCategory, selectedCategory]);

  const sortedVendors = useMemo(() => {
    const categoryFiltered = baseMatched.filter(
      (v) => effectiveCategory === 'all' || v.category === effectiveCategory
    );
    return sortCustomerVendors(categoryFiltered, sortBy, vegOnly);
  }, [baseMatched, effectiveCategory, sortBy, vegOnly]);

  const { openVendors, closedVendors } = useMemo(
    () => partitionCustomerVendors(sortedVendors),
    [sortedVendors]
  );

  // Popular vendors shelf (only open + reachable vendors matching vegOnly)
  const popularVendors = useMemo(() => {
    const pool = baseMatched.filter((v) => v.isOpen && v.canDeliverToGate !== false);
    return [...pool]
      .sort((a, b) => b.ratingAvg * Math.log10(Math.max(10, b.ratingCount)) - a.ratingAvg * Math.log10(Math.max(10, a.ratingCount)))
      .slice(0, 4);
  }, [baseMatched]);

  // Quick picks filtered cleanly by vegOnly & selected category when filtered
  const visibleQuickPicks = useMemo(() => {
    const picks = vendorsData?.quickPicks || [];
    return picks.filter((p) => {
      if (vegOnly && !p.isVeg) return false;
      if (effectiveCategory !== 'all' && p.vendorCategory !== effectiveCategory) return false;
      return true;
    });
  }, [vendorsData?.quickPicks, vegOnly, effectiveCategory]);

  const handleToggleVeg = () => {
    const nextVeg = !vegOnly;
    setVegOnly(nextVeg);
    const params = new URLSearchParams(searchParams);
    if (nextVeg) params.set('veg', 'true');
    else params.delete('veg');
    setSearchParams(params, { replace: true });
  };

  const handleQuickAdd = (pick: QuickPickItem) => {
    if (pick.hasCustomisation) {
      navigate(`/vendor/${pick.vendorSlug}`);
      return;
    }
    addItem(
      { id: pick.vendorId, name: pick.vendorName, slug: pick.vendorSlug },
      {
        itemId: pick.id,
        name: pick.name,
        pricePaise: pick.pricePaise,
        isVeg: pick.isVeg,
      }
    );
    if (!cartVendor || cartVendor.id === pick.vendorId || cartItems.length === 0) {
      showToast(`Added ${pick.name} to packet`, 'success');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-5 pb-28 lg:pb-10">
      <SeoHead
        title="Order Campus Meals, Fruits & Groceries | TreFood NIT Patna"
        description="Browse open NIT Patna campus kitchens, fruit stalls, daily groceries and raw chicken filtered live by gate reachability and hostel curfews."
        path={location.pathname === '/browse' ? '/browse' : '/app'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Primary Feed Column */}
        <div className="lg:col-span-8 min-w-0 space-y-5">
          {/* Gate & Curfew Strip */}
          {gatesLoading ? (
            <Skeleton className="h-20 w-full rounded-2xl" />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF8E1] text-[#830020] dark:bg-[#331F04] dark:text-[#FFB400]">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Delivering to Gate
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-[var(--color-text)] truncate">
                      {currentGate ? currentGate.name : 'Select Gate'}
                    </span>
                    {gateStatus && (
                      <Badge variant={gateStatus.is24x7 ? 'success' : gateStatus.isOpen ? 'warning' : 'closed'}>
                        {gateStatus.label}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {nightSafeNow && <Badge variant="night_safe">Night Safe Active</Badge>}
                <button
                  type="button"
                  onClick={() => setGatePickerOpen(true)}
                  className="min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3.5 text-xs font-bold text-[var(--color-text)] hover:border-[#830020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
                >
                  Change gate
                </button>
              </div>
            </div>
          )}

          {/* Live Curfew Warning if approaching 19:30 or closed */}
          {currentGate && gateStatus && !gateStatus.is24x7 && (gateStatus.isNearingCurfew || !gateStatus.isOpen) && (
            <CurfewBanner
              gateName={currentGate.name}
              curfewTime={currentGate.curfewTime}
              bufferMinutes={currentGate.bufferMinutes}
              isNearingCurfew={gateStatus.isNearingCurfew}
              isClosed={!gateStatus.isOpen}
              onSwitchGate={() => setGatePickerOpen(true)}
            />
          )}

          {/* Search Bar with Live Suggestions & Recent Searches */}
          <AppSearchBar gateId={selectedGateId} vegOnly={vegOnly} />

          {/* Promotions Carousel */}
          <PromotionCarousel
            coupons={couponsData?.coupons || []}
            announcements={annData?.announcements || []}
            loading={couponsLoading}
          />

          {/* Quick Picks Shelf */}
          {vendorsLoading ? (
            <div className="space-y-2.5">
              <Skeleton className="h-5 w-36 rounded-md" />
              <div className="flex gap-3 overflow-hidden">
                <Skeleton className="h-24 w-56 shrink-0 rounded-2xl" />
                <Skeleton className="h-24 w-56 shrink-0 rounded-2xl" />
                <Skeleton className="h-24 w-56 shrink-0 rounded-2xl" />
              </div>
            </div>
          ) : visibleQuickPicks.length > 0 ? (
            <section aria-label="Quick Picks" className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
                  <h2 className="text-sm font-bold text-[var(--color-text)]">Quick picks</h2>
                </div>
                <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
                  Popular &amp; ready fast
                </span>
              </div>
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 no-scrollbar">
                {visibleQuickPicks.map((pick) => (
                  <div
                    key={pick.id}
                    className="snap-start flex w-[236px] sm:w-[252px] shrink-0 items-center justify-between gap-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/vendor/${pick.vendorSlug}`)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] rounded-xl"
                    >
                      <img
                        src={pick.imageUrl || getVendorImageUrl(pick.vendorCategory)}
                        alt={pick.name}
                        width={48}
                        height={48}
                        loading="lazy"
                        className="h-12 w-12 rounded-xl object-cover shrink-0 border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)]"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            aria-hidden="true"
                            className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                              pick.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                            }`}
                          />
                          <span className="text-xs font-bold text-[var(--color-text)] truncate">
                            {pick.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                          {pick.vendorName} • ~{pick.etaMinutes}m
                        </div>
                        <div className="font-mono text-xs font-extrabold text-[var(--color-text)] mt-0.5">
                          ₹{(pick.pricePaise / 100).toFixed(0)}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAdd(pick)}
                      aria-label={`Add ${pick.name} to packet`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#830020]/30 bg-[#FFF8E1] text-[#830020] hover:bg-[#830020] hover:text-white dark:border-[#FFB400]/40 dark:bg-[#331F04] dark:text-[#FFB400] dark:hover:bg-[#FFB400] dark:hover:text-[#1C1917] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Category Chips with Live Counts (Disabled if Count === 0) */}
          <div aria-label="Filter by category" className="space-y-3">
            {vendorsLoading ? (
              <div className="flex gap-2 overflow-hidden">
                <Skeleton className="h-9 w-28 rounded-full shrink-0" />
                <Skeleton className="h-9 w-24 rounded-full shrink-0" />
                <Skeleton className="h-9 w-24 rounded-full shrink-0" />
                <Skeleton className="h-9 w-24 rounded-full shrink-0" />
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {categoriesWithCounts.map((cat) => (
                  <Chip
                    key={cat.id}
                    label={cat.label}
                    count={cat.count}
                    disabled={cat.disabled}
                    selected={effectiveCategory === cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                  />
                ))}
              </div>
            )}

            {/* Veg-only Toggle + Sort Bar (ETA, Rating, Price) */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--color-border-subtle)] pt-3">
              <button
                type="button"
                role="switch"
                aria-checked={vegOnly}
                onClick={handleToggleVeg}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] ${
                  vegOnly
                    ? 'border-[#15803D] bg-[#DCFCE7] text-[#14532D] dark:border-[#16A34A] dark:bg-[#052E16] dark:text-[#BBF7D0]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[#830020]'
                }`}
              >
                <Leaf className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Veg only</span>
              </button>

              <div
                role="group"
                aria-label="Sort campus vendors"
                className="flex flex-wrap items-center gap-1.5"
              >
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mr-1">
                  Sort:
                </span>
                {(
                  [
                    { id: 'eta', label: 'ETA' },
                    { id: 'rating', label: 'Rating' },
                    { id: 'price', label: 'Price' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={sortBy === opt.id}
                    onClick={() => setSortBy(opt.id)}
                    className={`min-h-[40px] rounded-full px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] ${
                      sortBy === opt.id
                        ? 'bg-[#830020] text-white dark:bg-[#FFB400] dark:text-[#1C1917]'
                        : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[#830020]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Popular Vendors Highlight (when viewing 'all') */}
          {!vendorsLoading && !vendorsError && effectiveCategory === 'all' && popularVendors.length > 0 && (
            <section aria-label="Popular campus vendors" className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
                  <h2 className="text-base font-bold text-[var(--color-text)]">Popular vendors</h2>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  Student favourites at NIT Patna
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {popularVendors.map((vendor) => (
                  <VendorCard
                    key={`pop-${vendor.id}`}
                    vendor={vendor}
                    variant="open"
                    isFavorite={Boolean(favData?.vendorIds?.includes(vendor.id))}
                    onToggleFavorite={() => handleToggleFavorite(vendor.id)}
                    onClick={() => navigate(`/vendor/${vendor.slug}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Open Now Sorted First + Slim Closed List */}
          {vendorsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VendorCardSkeleton />
              <VendorCardSkeleton />
              <VendorCardSkeleton />
              <VendorCardSkeleton />
            </div>
          ) : vendorsError ? (
            <ErrorState onRetry={() => refetchVendors()} />
          ) : sortedVendors.length === 0 ? (
            <EmptyState
              title="No campus vendors match right now"
              description="No active vendors match this gate and dietary selection."
              actionLabel="Reset Filters"
              onAction={() => {
                setSelectedCategory('all');
                setVegOnly(false);
              }}
            />
          ) : (
            <div className="space-y-7">
              {openVendors.length > 0 && (
                <section aria-label="Open campus vendors" className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text)]">
                      Open Now ({openVendors.length})
                    </h2>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#15803D]" aria-hidden="true" />
                      <span>Zero delivery fee • Verified packets</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {openVendors.map((vendor) => (
                      <VendorCard
                        key={vendor.id}
                        vendor={vendor}
                        variant="open"
                        isFavorite={Boolean(favData?.vendorIds?.includes(vendor.id))}
                        onToggleFavorite={() => handleToggleFavorite(vendor.id)}
                        onClick={() => navigate(`/vendor/${vendor.slug}`)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {closedVendors.length > 0 && (
                <section aria-label="Closed vendors" className="space-y-3">
                  <h2 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                    Closed right now ({closedVendors.length})
                  </h2>
                  <div className="space-y-2.5">
                    {closedVendors.map((vendor) => (
                      <VendorCard
                        key={vendor.id}
                        vendor={vendor}
                        variant="closed"
                        isFavorite={Boolean(favData?.vendorIds?.includes(vendor.id))}
                        onToggleFavorite={() => handleToggleFavorite(vendor.id)}
                        isNotified={notifiedVendorIds.includes(vendor.id)}
                        onNotify={() => handleNotifyToggle(vendor)}
                        onPreOrder={() => navigate(`/vendor/${vendor.slug}?preorder=1`)}
                        onClick={() => navigate(`/vendor/${vendor.slug}`)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Sticky Desktop Packet Sidebar (Right Column on >= lg) */}
        <DesktopPacketSidebar
          currentGate={currentGate}
          onOpenGatePicker={() => setGatePickerOpen(true)}
          favoritesCount={favData?.vendorIds?.length || 0}
        />
      </div>

      {/* Floating Cart Bar on Mobile/Tablet (< lg) */}
      {itemCount > 0 && (
        <div className="fixed bottom-16 left-3 right-3 z-30 md:bottom-6 lg:hidden">
          <div className="mx-auto max-w-md">
            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="flex w-full min-h-[56px] items-center justify-between rounded-2xl bg-[#830020] p-3.5 text-white shadow-xl dark:bg-[#FFB400] dark:text-[#1C1917] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 dark:bg-[#1C1917]/15 font-mono font-bold text-sm">
                  {itemCount}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-[11px] uppercase tracking-wide opacity-90 truncate">
                    {cartVendor?.name}
                  </div>
                  <div className="text-sm font-bold">
                    View Packet • ₹{((quote?.totalPaise || 0) / 100).toFixed(0)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-white/20 dark:bg-[#1C1917]/15 px-3 py-1.5 text-xs font-bold shrink-0">
                <span>Open Cart</span>
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Vendor Switch Conflict Dialog for Quick Picks */}
      <Dialog
        open={Boolean(pendingVendorSwitch)}
        onClose={cancelVendorSwitch}
        title={`Start a new cart with ${pendingVendorSwitch?.vendor.name || 'this vendor'}?`}
        description="TreFood orders come from one campus vendor per gate handover."
      >
        <p className="text-xs text-[var(--color-text-muted)] pt-1 pb-4">
          Your current packet has items from <strong>{cartVendor?.name}</strong>. Replace with{' '}
          <strong>{pendingVendorSwitch?.item.name}</strong> from{' '}
          <strong>{pendingVendorSwitch?.vendor.name}</strong>?
        </p>
        <div className="flex w-full gap-2 justify-end">
          <Button variant="secondary" onClick={cancelVendorSwitch}>
            Keep current packet
          </Button>
          <Button variant="primary" onClick={confirmVendorSwitch}>
            Start fresh packet
          </Button>
        </div>
      </Dialog>

      {/* Gate Picker Sheet / Popover */}
      <GatePicker
        gates={gatesData?.gates || []}
        selectedGateId={selectedGateId}
        onSelectGate={(gateOrId) => {
          const id = typeof gateOrId === 'string' ? gateOrId : gateOrId.id;
          setSelectedGateId(id);
          showToast('Updated delivery gate', 'info');
        }}
        isOpen={gatePickerOpen}
        onClose={() => setGatePickerOpen(false)}
      />

      {/* Lazy Cart Drawer */}
      {cartDrawerOpen && (
        <Suspense fallback={null}>
          <CartDrawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
