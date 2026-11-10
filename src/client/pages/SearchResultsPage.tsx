import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { AppSearchBar, saveRecentSearch } from '../components/app/AppSearchBar';
import { DesktopPacketSidebar } from '../components/app/DesktopPacketSidebar';
import { VendorCard, getVendorImageUrl } from '../components/ui/VendorCard';
import { GatePicker } from '../components/ui/GatePicker';
import { Chip, Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { VendorCardSkeleton, MenuItemSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { SeoHead } from '../components/seo/SeoHead';
import { useToast } from '../components/ui/Toast';
import { CUSTOMER_CATEGORY_DEFS } from '@shared/catalogFilters';
import { ArrowLeft, Leaf, Clock, ShoppingBag, Plus } from 'lucide-react';
import type { Gate } from '@shared/schemas';
import type { CombinedSearchResponse, SearchDishResult } from '@shared/types';

const CartDrawer = lazy(() =>
  import('../components/cart/CartDrawer').then((m) => ({ default: m.CartDrawer }))
);

type SearchTab = 'all' | 'vendors' | 'dishes';
type SearchSort = 'relevance' | 'eta' | 'rating' | 'price_asc';

export function SearchResultsPage() {
  const navigate = useNavigate();
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

  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || 'all'
  );
  const [vegOnly, setVegOnly] = useState<boolean>(
    searchParams.get('veg') === 'true' || searchParams.get('veg') === '1'
  );
  const [openOnly, setOpenOnly] = useState<boolean>(
    searchParams.get('open') === 'true' || searchParams.get('open') === '1'
  );
  const [sortBy, setSortBy] = useState<SearchSort>('relevance');
  const [gatePickerOpen, setGatePickerOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  useEffect(() => {
    const paramQ = searchParams.get('q') || '';
    setQuery(paramQ);
  }, [searchParams]);

  const { data: gatesData } = useQuery<{ gates: Gate[] }>({
    queryKey: ['gates'],
    queryFn: async () => {
      const res = await fetch('/api/gates');
      return res.json();
    },
    staleTime: 60000,
  });

  const currentGate = gatesData?.gates?.find((g) => g.id === selectedGateId) || null;

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
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      showToast(vars.isFav ? 'Removed from favourites' : 'Saved to favourites', 'success');
    },
  });

  const handleToggleFavorite = (vendorId: string) => {
    if (!user) {
      navigate(
        `/signin?returnTo=${encodeURIComponent(`/app/search?${searchParams.toString()}`)}&reason=favorites`
      );
      return;
    }
    const isFav = Boolean(favData?.vendorIds?.includes(vendorId));
    favMutation.mutate({ vendorId, isFav });
  };

  // Query combined results (fetched without category filter so we can compute non-zero category counts accurately!)
  const {
    data: searchData,
    isLoading,
    error,
    refetch,
  } = useQuery<CombinedSearchResponse>({
    queryKey: ['combined-search', query, selectedGateId, vegOnly, openOnly, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      params.set('gateId', selectedGateId);
      if (vegOnly) params.set('veg', 'true');
      if (openOnly) params.set('open', 'true');
      params.set('sort', sortBy);
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to search campus catalog');
      return res.json();
    },
    staleTime: 15000,
  });

  const allMatchedVendors = searchData?.vendors || [];
  const allMatchedDishes = searchData?.dishes || [];

  // Category chips computed across vendors + dishes matching query/veg/open, disabling zero-result chips
  const categoryChips = useMemo(() => {
    return CUSTOMER_CATEGORY_DEFS.map((def) => {
      const vCount =
        def.id === 'all'
          ? allMatchedVendors.length
          : allMatchedVendors.filter((v) => v.category === def.id).length;
      const dCount =
        def.id === 'all'
          ? allMatchedDishes.length
          : allMatchedDishes.filter((d) => d.vendorCategory === def.id).length;
      const total = vCount + dCount;
      return {
        id: def.id,
        label: def.label,
        count: total,
        disabled: total === 0,
      };
    });
  }, [allMatchedVendors, allMatchedDishes]);

  const effectiveCategory = useMemo(() => {
    const match = categoryChips.find((c) => c.id === selectedCategory);
    return selectedCategory !== 'all' && match && match.count > 0 ? selectedCategory : 'all';
  }, [categoryChips, selectedCategory]);

  useEffect(() => {
    if (effectiveCategory !== selectedCategory) {
      setSelectedCategory(effectiveCategory);
    }
  }, [effectiveCategory, selectedCategory]);

  const filteredVendors = useMemo(
    () =>
      allMatchedVendors.filter(
        (v) => effectiveCategory === 'all' || v.category === effectiveCategory
      ),
    [allMatchedVendors, effectiveCategory]
  );

  const filteredDishes = useMemo(
    () =>
      allMatchedDishes.filter(
        (d) => effectiveCategory === 'all' || d.vendorCategory === effectiveCategory
      ),
    [allMatchedDishes, effectiveCategory]
  );

  // Switch away from empty tab automatically if needed
  const effectiveTab: SearchTab = useMemo(() => {
    if (activeTab === 'vendors' && filteredVendors.length === 0 && filteredDishes.length > 0) {
      return 'all';
    }
    if (activeTab === 'dishes' && filteredDishes.length === 0 && filteredVendors.length > 0) {
      return 'all';
    }
    return activeTab;
  }, [activeTab, filteredVendors.length, filteredDishes.length]);

  const handleSearchSubmit = (nextQuery: string) => {
    const clean = nextQuery.trim();
    if (clean) saveRecentSearch(clean);
    setQuery(clean);
    const next = new URLSearchParams(searchParams);
    if (clean) next.set('q', clean);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const handleAddDish = (dish: SearchDishResult) => {
    if (!dish.inStock) return;
    if (dish.hasCustomisation) {
      navigate(`/vendor/${dish.vendorSlug}`);
      return;
    }
    addItem(
      { id: dish.vendorId, name: dish.vendorName, slug: dish.vendorSlug },
      {
        itemId: dish.id,
        name: dish.name,
        pricePaise: dish.pricePaise,
        isVeg: dish.isVeg,
      }
    );
    if (!cartVendor || cartVendor.id === dish.vendorId || cartItems.length === 0) {
      showToast(`Added ${dish.name} to packet`, 'success');
    }
  };

  const totalResultsCount = filteredVendors.length + filteredDishes.length;

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-5 pb-28 lg:pb-10">
      <SeoHead
        title={query ? `Search "${query}" | TreFood NIT Patna` : 'Search Canteens & Dishes | TreFood NIT Patna'}
        description="Search NIT Patna campus vendors, meals, snacks, fruits, groceries and dishes filtered live by gate curfew and dietary preference."
        path="/app/search"
      />

      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Campus Home</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Search Column */}
        <div className="lg:col-span-8 min-w-0 space-y-5">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
              {query ? `Results for "${query}"` : 'Search Canteens & Dishes'}
            </h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              Searching across NIT Patna vendors and individual menu dishes for{' '}
              <strong>{currentGate?.name || 'your gate'}</strong>.
            </p>
          </div>

          <AppSearchBar
            initialQuery={query}
            gateId={selectedGateId}
            vegOnly={vegOnly}
            onQuerySubmit={handleSearchSubmit}
          />

          {/* Type Tabs (All / Vendors / Dishes) */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'all', label: 'All results', count: totalResultsCount },
                { id: 'vendors', label: 'Vendors', count: filteredVendors.length },
                { id: 'dishes', label: 'Dishes', count: filteredDishes.length },
              ] as const
            ).map((tab) => (
              <Chip
                key={tab.id}
                label={tab.label}
                count={tab.count}
                disabled={tab.id !== 'all' && tab.count === 0}
                selected={effectiveTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>

          {/* Category Chips (Zero-result prevented) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categoryChips.map((cat) => (
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

          {/* Veg, Open & Sort Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--color-border-subtle)] pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={vegOnly}
                onClick={() => setVegOnly((v) => !v)}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] ${
                  vegOnly
                    ? 'border-[#15803D] bg-[#DCFCE7] text-[#14532D] dark:border-[#16A34A] dark:bg-[#052E16] dark:text-[#BBF7D0]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
                }`}
              >
                <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Veg only</span>
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={openOnly}
                onClick={() => setOpenOnly((o) => !o)}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] ${
                  openOnly
                    ? 'border-[#830020] bg-[#830020] text-white dark:border-[#FFB400] dark:bg-[#FFB400] dark:text-[#1C1917]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
                }`}
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Open now</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sort search results">
              {(
                [
                  { id: 'relevance', label: 'Relevance' },
                  { id: 'eta', label: 'ETA' },
                  { id: 'rating', label: 'Rating' },
                  { id: 'price_asc', label: 'Price' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={sortBy === opt.id}
                  onClick={() => setSortBy(opt.id)}
                  className={`min-h-[40px] rounded-full px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400] ${
                    sortBy === opt.id
                      ? 'bg-[#830020] text-white dark:bg-[#FFB400] dark:text-[#1C1917]'
                      : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Body */}
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <VendorCardSkeleton />
                <VendorCardSkeleton />
              </div>
              <MenuItemSkeleton />
              <MenuItemSkeleton />
            </div>
          ) : error ? (
            <ErrorState onRetry={() => refetch()} />
          ) : totalResultsCount === 0 ? (
            <EmptyState
              title="No vendors or dishes matched"
              description={`No canteens or dishes matched "${query || 'your filters'}" at this gate.`}
              actionLabel="Reset Search Filters"
              onAction={() => {
                handleSearchSubmit('');
                setSelectedCategory('all');
                setVegOnly(false);
                setOpenOnly(false);
              }}
            />
          ) : (
            <div className="space-y-8">
              {/* Matching Vendors */}
              {(effectiveTab === 'all' || effectiveTab === 'vendors') && filteredVendors.length > 0 && (
                <section aria-label="Matching Vendors" className="space-y-3">
                  <h2 className="text-base font-bold text-[var(--color-text)]">
                    Matching Vendors ({filteredVendors.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredVendors.map((v) => (
                      <VendorCard
                        key={v.id}
                        vendor={v}
                        isFavorite={Boolean(favData?.vendorIds?.includes(v.id))}
                        onToggleFavorite={() => handleToggleFavorite(v.id)}
                        onPreOrder={!v.isOpen || v.canDeliverToGate === false ? () => navigate(`/vendor/${v.slug}?preorder=1`) : undefined}
                        onClick={() => navigate(`/vendor/${v.slug}`)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Matching Dishes */}
              {(effectiveTab === 'all' || effectiveTab === 'dishes') && filteredDishes.length > 0 && (
                <section aria-label="Matching Dishes" className="space-y-3">
                  <h2 className="text-base font-bold text-[var(--color-text)]">
                    Matching Dishes &amp; Items ({filteredDishes.length})
                  </h2>
                  <div className="space-y-3">
                    {filteredDishes.map((dish) => (
                      <article
                        key={dish.id}
                        className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]"
                      >
                        <button
                          type="button"
                          onClick={() => navigate(`/vendor/${dish.vendorSlug}`)}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
                        >
                          <img
                            src={dish.imageUrl || getVendorImageUrl(dish.vendorCategory)}
                            alt={dish.name}
                            width={64}
                            height={64}
                            loading="lazy"
                            className={`h-16 w-16 rounded-xl object-cover shrink-0 border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] ${
                              !dish.inStock ? 'grayscale opacity-70' : ''
                            }`}
                          />
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={dish.isVeg ? 'veg' : 'nonveg'} />
                              <h3 className="text-sm font-bold text-[var(--color-text)] truncate max-w-full">
                                {dish.name}
                              </h3>
                              {!dish.inStock && <Badge variant="closed">Out of stock</Badge>}
                            </div>
                            <p className="text-xs text-[var(--color-text-muted)] line-clamp-1">
                              {dish.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-mono font-extrabold text-[var(--color-text)]">
                                ₹{(dish.pricePaise / 100).toFixed(0)}
                              </span>
                              <span className="text-[var(--color-text-muted)]">
                                • from <strong>{dish.vendorName}</strong> (~{dish.etaMinutes}m)
                              </span>
                              {!dish.vendorIsOpen && <Badge variant="closed">Vendor Closed</Badge>}
                            </div>
                          </div>
                        </button>

                        <div className="shrink-0">
                          {!dish.inStock ? (
                            <Badge variant="closed">Unavailable</Badge>
                          ) : !dish.canDeliverToGate ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate(`/vendor/${dish.vendorSlug}?preorder=1`)}
                            >
                              Pre-order
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleAddDish(dish)}
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                              <span>{dish.hasCustomisation ? 'Options' : 'Add'}</span>
                            </Button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Sticky Desktop Packet Sidebar */}
        <DesktopPacketSidebar
          currentGate={currentGate}
          onOpenGatePicker={() => setGatePickerOpen(true)}
          favoritesCount={favData?.vendorIds?.length || 0}
        />
      </div>

      {/* Floating Cart Bar (< lg) */}
      {itemCount > 0 && (
        <div className="fixed bottom-16 left-3 right-3 z-30 md:bottom-6 lg:hidden">
          <div className="mx-auto max-w-md">
            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="flex w-full min-h-[56px] items-center justify-between rounded-2xl bg-[#830020] p-3.5 text-white shadow-xl dark:bg-[#FFB400] dark:text-[#1C1917] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 font-mono font-bold text-sm">
                  {itemCount}
                </div>
                <div className="text-left">
                  <div className="text-[11px] uppercase tracking-wide opacity-90">
                    {cartVendor?.name}
                  </div>
                  <div className="text-sm font-bold">
                    View Packet • ₹{((quote?.totalPaise || 0) / 100).toFixed(0)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-bold">
                <span>Open Cart</span>
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Vendor Switch Dialog */}
      <Dialog
        open={Boolean(pendingVendorSwitch)}
        onClose={cancelVendorSwitch}
        title={`Start a new cart with ${pendingVendorSwitch?.vendor.name || 'this vendor'}?`}
        description="Your campus cart holds items from one vendor at a time."
      >
        <p className="text-xs text-[var(--color-text-muted)] pt-1 pb-4">
          Start a fresh packet with <strong>{pendingVendorSwitch?.item.name}</strong> from{' '}
          <strong>{pendingVendorSwitch?.vendor.name}</strong>?
        </p>
        <div className="flex w-full gap-2 justify-end">
          <Button variant="secondary" onClick={cancelVendorSwitch}>
            Keep current
          </Button>
          <Button variant="primary" onClick={confirmVendorSwitch}>
            Replace packet
          </Button>
        </div>
      </Dialog>

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

      {cartDrawerOpen && (
        <Suspense fallback={null}>
          <CartDrawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
