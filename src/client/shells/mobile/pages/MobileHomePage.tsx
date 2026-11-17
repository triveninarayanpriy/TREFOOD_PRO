import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../../../context/CartContext';
import { useToast } from '../../../components/ui/Toast';
import { ResponsiveImage } from '../../../components/ui/ResponsiveImage';
import { MobileVendorCard } from '../../../components/v2/VendorCard/MobileVendorCard';
import { MobileCardSkeleton } from '../../../components/v2/Skeleton/Skeleton';
import { EmptyStateV2 } from '../../../components/v2/EmptyState/EmptyState';
import { isNightSafetyActive } from '@shared/curfew';
import {
  ShieldCheck,
  Search,
  UtensilsCrossed,
  Clock,
  Plus,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import type { VendorSummary } from '@shared/types';
import type { Gate } from '@shared/schemas';

interface QuickPickDish {
  id?: string;
  name: string;
  vendorSlug: string;
  pricePaise: number;
  imageUrl: string;
  isVeg?: boolean;
}

const CATEGORY_CHIPS = [
  { id: 'all', name: 'All Canteens', image: '/images/categories/food.jpg' },
  { id: 'meals', name: 'Meals & Biryani', image: '/images/categories/food.jpg' },
  { id: 'beverages', name: 'Juices & Shakes', image: '/images/categories/juices.jpg' },
  { id: 'vegetables', name: 'Fresh Produce', image: '/images/categories/vegetables-real.jpg' },
  { id: 'groceries', name: 'Snacks & Cafe', image: '/images/categories/groceries-real.jpg' },
  { id: 'raw_chicken', name: 'Raw Chicken', image: '/images/categories/chicken-real.jpg' },
];

export function MobileHomePage() {
  const navigate = useNavigate();
  const { selectedGateId, addItem } = useCart();
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const nightSafety = isNightSafetyActive();

  // Pull-to-refresh state
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);

  // Fetch vendors & quick picks
  const {
    data: vendorData,
    isLoading: vendorsLoading,
    refetch: refetchVendors,
  } = useQuery<{
    ok: boolean;
    vendors: VendorSummary[];
    quickPicks?: QuickPickDish[];
  }>({
    queryKey: ['vendors', selectedGateId],
    queryFn: async () => {
      const res = await fetch(`/api/vendors?gateId=${selectedGateId || 'gate_main'}`);
      return res.json();
    },
  });

  // Fetch gates for live status countdown
  const { data: gatesData } = useQuery<{ ok: boolean; gates: Gate[] }>({
    queryKey: ['gates'],
    queryFn: async () => {
      const res = await fetch('/api/gates');
      return res.json();
    },
    staleTime: 60000,
  });

  const vendors: VendorSummary[] = vendorData?.vendors || [];
  const quickPicks: QuickPickDish[] = vendorData?.quickPicks || [];
  const gates: Gate[] = gatesData?.gates || [];

  const currentGate = gates.find((g) => g.id === selectedGateId) || gates[0] || {
    id: 'gate_main',
    name: 'Main Gate / Academic Blocks',
    curfewTime: '23:59',
    is24x7: true,
  };

  // Open & closed partitions
  const openVendors = useMemo(
    () => vendors.filter((v) => v.isOpen && v.canDeliverToGate !== false),
    [vendors]
  );
  const closedVendors = useMemo(
    () => vendors.filter((v) => !v.isOpen || v.canDeliverToGate === false),
    [vendors]
  );

  const filteredOpenVendors = useMemo(() => {
    if (activeCategory === 'all') return openVendors;
    if (activeCategory === 'beverages') {
      return openVendors.filter((v) => v.category === 'beverages' || v.category === 'juices');
    }
    return openVendors.filter((v) => v.category === activeCategory);
  }, [openVendors, activeCategory]);

  // Pull to refresh touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current !== null && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY.current;
      if (diff > 0) {
        setPullY(Math.min(diff * 0.45, 80));
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullY > 50 && !refreshing) {
      setRefreshing(true);
      setPullY(50);
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(10);
        }
      } catch {
        // Haptic feedback fallback
      }
      await refetchVendors();
      showToast('Menus refreshed with live gate timing', 'info');
      setRefreshing(false);
      setPullY(0);
    } else {
      setPullY(0);
    }
    touchStartY.current = null;
  };

  const handleQuickAdd = (dish: QuickPickDish) => {
    const parentVendor = vendors.find((v) => v.slug === dish.vendorSlug);
    if (!parentVendor) return;

    addItem(
      { id: parentVendor.id, name: parentVendor.name, slug: parentVendor.slug },
      {
        itemId: dish.id || dish.name,
        name: dish.name,
        pricePaise: dish.pricePaise,
        isVeg: dish.isVeg ?? false,
      }
    );
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(12);
      }
    } catch {
      // ignore
    }
    showToast(`Added ${dish.name} to campus packet`, 'success');
  };

  const is24x7 = currentGate.is24x7 || currentGate.curfewTime === '23:59' || currentGate.curfewTime?.toLowerCase() === '24x7';

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="space-y-5 pb-24 select-none"
    >
      {/* Pull To Refresh Indicator */}
      {pullY > 0 && (
        <div
          style={{ height: `${pullY}px` }}
          className="flex items-center justify-center overflow-hidden transition-all duration-150"
        >
          <div className="flex items-center gap-2 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] px-3.5 py-1 text-[12px] font-bold text-[#830020] shadow-sm">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Updating menus...' : pullY > 50 ? 'Release to refresh' : 'Pull down to refresh'}</span>
          </div>
        </div>
      )}

      {/* 1. Compact Gate Status Pill with Live Curfew Countdown */}
      <section aria-label="Campus Gate Notice" className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#830020]/10 text-[#830020] dark:bg-[#FFB400]/20 dark:text-[#FFB400] shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Gate Drop Point
              </div>
              <div className="font-bold text-[14px] text-[var(--color-text)] truncate">
                {currentGate.name}
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            {is24x7 ? (
              <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                Open 24x7
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                Curfew {currentGate.curfewTime} IST
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Quick Search Bar */}
      <button
        type="button"
        onClick={() => navigate('/app/search')}
        className="flex w-full min-h-[44px] items-center justify-between rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-2.5 text-[14px] text-[var(--color-text-muted)] active:scale-[0.98] transition-transform cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Search className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
          <span className="truncate">Search biryani, pizza, cold coffee, rolls...</span>
        </div>
        <span className="text-[12px] font-bold text-[#830020] dark:text-[#FFB400] shrink-0">
          Find
        </span>
      </button>

      {/* Campus Night Safety Banner */}
      {nightSafety && (
        <section aria-label="Night Safety Alert" className="flex items-center gap-2.5 rounded-[16px] bg-[#830020]/10 border border-[#830020]/25 p-3 text-[13px] text-[#830020] dark:text-[#FFB400] dark:bg-[#FFB400]/10 dark:border-[#FFB400]/25">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[#830020] dark:text-[#FFB400]" />
          <div className="leading-tight">
            <span className="font-bold">Campus Night Safety: </span>
            <span>After 7 PM, deliveries are handled personally by senior counter owners at NIT Patna gates.</span>
          </div>
        </section>
      )}

      {/* 2. Horizontal Row of Category Photo Chips */}
      <section aria-label="Campus Categories" className="space-y-2">
        <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] px-0.5">
          Campus Categories
        </div>
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar snap-x pb-1">
          {CATEGORY_CHIPS.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 snap-start transition-all cursor-pointer active:scale-95 ${
                  isActive
                    ? 'border-[#830020] bg-[#830020] text-white shadow-xs'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[#830020]'
                }`}
              >
                <img
                  src={cat.image}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full object-cover shrink-0"
                />
                <span className="text-[13px] font-bold whitespace-nowrap">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. "Open now" Full-Width Vendor Cards (16:10 Photos) */}
      <section aria-label="Open Now Campus Canteens" className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="font-display text-[20px] font-bold text-[var(--color-text)]">
            Open Now
          </h2>
          <span className="text-[13px] font-bold text-[#830020] dark:text-[#FFB400]">
            {filteredOpenVendors.length} active counters
          </span>
        </div>

        {vendorsLoading ? (
          <div className="space-y-4">
            <MobileCardSkeleton />
            <MobileCardSkeleton />
          </div>
        ) : filteredOpenVendors.length === 0 ? (
          <EmptyStateV2
            icon={<UtensilsCrossed className="h-6 w-6" />}
            title="No canteens open in this category"
            description="Check back later or browse other categories available for delivery to your gate."
            actionLabel="View all canteens"
            onAction={() => setActiveCategory('all')}
          />
        ) : (
          <div className="space-y-4">
            {filteredOpenVendors.map((vendor) => (
              <MobileVendorCard
                key={vendor.id}
                vendor={vendor}
                onClick={() => navigate(`/vendor/${vendor.slug}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Closed Canteens Quiet Row */}
      {closedVendors.length > 0 && (
        <section aria-label="Closed Counters" className="pt-2 space-y-2">
          <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] px-0.5">
            Opening Later ({closedVendors.length})
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {closedVendors.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => navigate(`/vendor/${v.slug}`)}
                className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-left shrink-0 active:scale-95 transition-transform"
              >
                <div className="h-6 w-6 rounded-full overflow-hidden bg-stone-800 shrink-0">
                  <ResponsiveImage
                    src={v.coverImageUrl || `/images/vendors/${v.slug}.jpg`}
                    alt={v.name}
                    crop="1x1"
                    width={24}
                    height={24}
                    className="h-full w-full object-cover grayscale opacity-60"
                  />
                </div>
                <div className="text-[13px] font-medium text-[var(--color-text-muted)] truncate max-w-[140px]">
                  {v.name}
                </div>
                <span className="text-[11px] font-bold text-stone-500">Opens later</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 4. "Popular dishes" as a 2-Column Grid */}
      {quickPicks.length > 0 && (
        <section aria-label="Popular Dishes" className="space-y-3 pt-3">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h2 className="font-display text-[20px] font-bold text-[var(--color-text)]">
                Popular Dishes
              </h2>
              <p className="text-[12px] text-[var(--color-text-muted)]">
                Most ordered at NIT Patna hostels
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/search')}
              className="inline-flex items-center gap-0.5 text-[13px] font-bold text-[#830020] dark:text-[#FFB400] active:underline"
            >
              <span>See all</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {quickPicks.slice(0, 6).map((dish) => {
              const rupeePrice = `₹${Math.round(dish.pricePaise / 100)}`;
              return (
                <div
                  key={`${dish.vendorSlug}-${dish.name}`}
                  className="flex flex-col justify-between overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs active:scale-[0.98] transition-transform"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-stone-900">
                    <ResponsiveImage
                      src={dish.imageUrl}
                      alt={dish.name}
                      crop="1x1"
                      width={240}
                      height={240}
                      className="h-full w-full object-cover tf-photo-warm"
                    />
                    <div className="absolute top-2 left-2">
                      <span
                        className={`inline-block h-3 w-3 rounded-full border-2 border-white shadow-xs ${
                          dish.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                        }`}
                        title={dish.isVeg ? 'Veg' : 'Non-veg'}
                      />
                    </div>
                  </div>

                  <div className="p-2.5 flex flex-col justify-between flex-1 space-y-2">
                    <div>
                      <h3 className="font-sans text-[14px] font-bold text-[var(--color-text)] leading-snug line-clamp-1">
                        {dish.name}
                      </h3>
                      <p className="text-[11px] text-[var(--color-text-muted)] truncate capitalize mt-0.5">
                        {dish.vendorSlug.replace(/-/g, ' ')}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border-subtle)]">
                      <span className="font-extrabold text-[15px] text-[var(--color-text)]">
                        {rupeePrice}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(dish)}
                        aria-label={`Add ${dish.name} for ${rupeePrice}`}
                        className="flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[#830020] text-white shadow-xs hover:bg-[#680019] active:scale-90 transition-all cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default MobileHomePage;
