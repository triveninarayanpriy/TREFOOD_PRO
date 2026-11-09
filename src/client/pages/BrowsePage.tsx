import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../context/CartContext';
import { Input } from '../components/ui/Input';
import { Chip, Badge } from '../components/ui/Badge';
import { VendorCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { GatePicker } from '../components/ui/GatePicker';
import { CurfewBanner } from '../components/ui/CurfewBanner';
import {
  MealsIllustration,
  FruitsIllustration,
  GroceriesIllustration,
  VegetablesIllustration,
  RawChickenIllustration,
  LateNightIllustration,
} from '../components/illustrations';
import {
  Search,
  Clock,
  Star,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import type { Gate, VendorSummary } from '@shared/types';

export function BrowsePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedGateId, setSelectedGateId } = useCart();

  const [gatePickerOpen, setGatePickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || 'all'
  );
  const [vegOnly, setVegOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [under100, setUnder100] = useState(false);
  const [sortBy, setSortBy] = useState<'fastest' | 'rating'>('fastest');

  // Debounce search query 250ms
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch gates
  const { data: gatesData } = useQuery<{ gates: Gate[] }>({
    queryKey: ['gates'],
    queryFn: async () => {
      const res = await fetch('/api/gates');
      return res.json();
    },
    staleTime: 60000,
  });

  const currentGate = gatesData?.gates?.find((g) => g.id === selectedGateId);

  // Fetch vendors for current gate
  const {
    data: vendorsData,
    isLoading: vendorsLoading,
    error: vendorsError,
    refetch: refetchVendors,
  } = useQuery<{ vendors: VendorSummary[] }>({
    queryKey: ['vendors', selectedGateId],
    queryFn: async () => {
      const res = await fetch(`/api/vendors?gateId=${selectedGateId}`);
      if (!res.ok) throw new Error('Failed to load campus vendors');
      return res.json();
    },
    staleTime: 30000,
  });

  // Client-side filtering and sorting for instant interactivity
  const filteredVendors = useMemo(() => {
    if (!vendorsData?.vendors) return [];

    return vendorsData.vendors
      .filter((vendor) => {
        // Category filter
        if (selectedCategory !== 'all' && vendor.category !== selectedCategory) {
          return false;
        }

        // Open only
        if (openOnly && !vendor.isOpen) {
          return false;
        }

        // Search query
        if (debouncedQuery.trim()) {
          const q = debouncedQuery.toLowerCase();
          const matchName = vendor.name.toLowerCase().includes(q);
          const matchDesc = vendor.description?.toLowerCase().includes(q);
          const matchCat = vendor.category.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') {
          return b.ratingAvg - a.ratingAvg;
        }
        // fastest prep + travel
        return a.prepMinutes - b.prepMinutes;
      });
  }, [vendorsData, selectedCategory, openOnly, debouncedQuery, sortBy]);

  const categories = [
    { id: 'all', label: 'All Canteens' },
    { id: 'meals', label: 'Meals' },
    { id: 'snacks', label: 'Snacks' },
    { id: 'fruits', label: 'Fruits' },
    { id: 'groceries', label: 'Groceries' },
    { id: 'vegetables', label: 'Vegetables' },
    { id: 'raw_chicken', label: 'Raw Chicken' },
    { id: 'late_night', label: 'Late Night' },
  ];

  const getIllustration = (category: string) => {
    switch (category) {
      case 'fruits':
        return <FruitsIllustration size={36} />;
      case 'groceries':
        return <GroceriesIllustration size={36} />;
      case 'vegetables':
        return <VegetablesIllustration size={36} />;
      case 'raw_chicken':
        return <RawChickenIllustration size={36} />;
      case 'late_night':
        return <LateNightIllustration size={36} />;
      default:
        return <MealsIllustration size={36} />;
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 space-y-5">
      {/* Gate Selector Pill Banner */}
      <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-3.5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
            <MapPin className="h-5 w-5 text-[#830020] dark:text-amber-400" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Delivering to Gate
            </div>
            <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
              {currentGate ? `${currentGate.name} (Curfew ${currentGate.curfewTime})` : 'Select Gate'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setGatePickerOpen(true)}
          className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200"
        >
          Change
        </button>
      </div>

      {/* Curfew Alert Banner if gate has impending curfew */}
      {currentGate && (
        <CurfewBanner
          gateName={currentGate.name}
          curfewTime={currentGate.curfewTime}
          bufferMinutes={currentGate.bufferMinutes}
          onSwitchGate={() => setGatePickerOpen(true)}
        />
      )}

      {/* Search Input with 250ms Debounce */}
      <div className="relative">
        <Input
          placeholder="Search campus canteens, dishes, fruits, groceries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          className="h-12 text-sm shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-3.5 text-xs text-stone-400 hover:text-stone-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Horizontal Scrollable Category Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <Chip
            key={cat.id}
            label={cat.label}
            selected={selectedCategory === cat.id}
            onClick={() => setSelectedCategory(cat.id)}
          />
        ))}
      </div>

      {/* Filter and Sort Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100 dark:border-stone-800">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setOpenOnly(!openOnly)}
            className={`rounded-full px-3 py-1 font-semibold transition-all ${
              openOnly
                ? 'bg-emerald-600 text-white'
                : 'border border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-850 dark:text-stone-300'
            }`}
          >
            Open now
          </button>
          <button
            type="button"
            onClick={() => setVegOnly(!vegOnly)}
            className={`rounded-full px-3 py-1 font-semibold transition-all ${
              vegOnly
                ? 'bg-emerald-700 text-white'
                : 'border border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-850 dark:text-stone-300'
            }`}
          >
            Veg only
          </button>
          <button
            type="button"
            onClick={() => setUnder100(!under100)}
            className={`rounded-full px-3 py-1 font-semibold transition-all ${
              under100
                ? 'bg-[#830020] text-white'
                : 'border border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-850 dark:text-stone-300'
            }`}
          >
            Under ₹100
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          <span>Sort:</span>
          <button
            type="button"
            onClick={() => setSortBy(sortBy === 'fastest' ? 'rating' : 'fastest')}
            className="font-semibold text-stone-900 underline dark:text-stone-100"
          >
            {sortBy === 'fastest' ? 'Fastest prep' : 'Top rated'}
          </button>
        </div>
      </div>

      {/* Vendors List */}
      <div className="space-y-3 pt-2">
        {vendorsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <VendorCardSkeleton />
            <VendorCardSkeleton />
            <VendorCardSkeleton />
            <VendorCardSkeleton />
          </div>
        ) : vendorsError ? (
          <ErrorState onRetry={() => refetchVendors()} />
        ) : filteredVendors.length === 0 ? (
          <EmptyState
            title="No campus vendors found"
            description="No active vendors match your search and filter criteria for this gate."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setOpenOnly(false);
              setVegOnly(false);
              setUnder100(false);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredVendors.map((vendor) => {
              const isBusy = vendor.busyUntil && vendor.busyUntil > Math.floor(Date.now() / 1000);

              return (
                <div
                  key={vendor.id}
                  onClick={() => navigate(`/vendor/${vendor.slug}`)}
                  className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-xs transition-all hover:border-[#830020] hover:shadow-md cursor-pointer dark:border-stone-800 dark:bg-stone-900 focus:ring-2 focus:ring-[#830020]"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(`/vendor/${vendor.slug}`);
                    }
                  }}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-50 border border-stone-100 dark:bg-stone-850 dark:border-stone-800 shrink-0">
                          {getIllustration(vendor.category)}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 leading-snug">
                            {vendor.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-stone-500 capitalize">
                              {vendor.category.replace('_', ' ')}
                            </span>
                            {vendor.ratingAvg > 0 && (
                              <div className="flex items-center gap-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                <span>{vendor.ratingAvg.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Open / Busy Status Badge */}
                      <div>
                        {!vendor.isOpen ? (
                          <Badge variant="danger">Closed</Badge>
                        ) : isBusy ? (
                          <Badge variant="warning">Busy</Badge>
                        ) : (
                          <Badge variant="success">Open</Badge>
                        )}
                      </div>
                    </div>

                    {vendor.description && (
                      <p className="mt-2.5 text-xs text-stone-600 dark:text-stone-400 line-clamp-2">
                        {vendor.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-stone-100 pt-3 mt-3 text-xs text-stone-500 dark:border-stone-800">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-stone-400" />
                      <span>~{vendor.prepMinutes} mins prep</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#830020] dark:text-amber-400 font-semibold">
                      <span>View Menu</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gate Picker Sheet */}
      <GatePicker
        open={gatePickerOpen}
        onClose={() => setGatePickerOpen(false)}
        currentGateId={selectedGateId}
        onSelectGate={(gate: any) => {
          const id = typeof gate === 'string' ? gate : gate.id;
          setSelectedGateId(id);
          setGatePickerOpen(false);
        }}
      />
    </div>
  );
}
