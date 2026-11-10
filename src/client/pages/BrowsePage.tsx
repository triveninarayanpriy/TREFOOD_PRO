import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../context/CartContext';
import { Input } from '../components/ui/Input';
import { Chip, Badge } from '../components/ui/Badge';
import { VendorCard } from '../components/ui/VendorCard';
import { VendorCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { GatePicker } from '../components/ui/GatePicker';
import { CurfewBanner } from '../components/ui/CurfewBanner';
import { SeoHead } from '../components/seo/SeoHead';
import { useToast } from '../components/ui/Toast';
import { getGateCurfewStatus, isNightSafetyActive } from '@shared/curfew';
import { Search, MapPin, ShieldCheck } from 'lucide-react';
import type { Gate } from '@shared/schemas';
import type { VendorSummary } from '@shared/types';

export function BrowsePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedGateId, setSelectedGateId } = useCart();
  const { showToast } = useToast();

  const [gatePickerOpen, setGatePickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || 'all'
  );
  const [vegOnly, setVegOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'fastest' | 'rating'>('fastest');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: gatesData } = useQuery<{ gates: Gate[] }>({
    queryKey: ['gates'],
    queryFn: async () => {
      const res = await fetch('/api/gates');
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
  } = useQuery<{ vendors: VendorSummary[] }>({
    queryKey: ['vendors', selectedGateId],
    queryFn: async () => {
      const res = await fetch(`/api/vendors?gateId=${selectedGateId}`);
      if (!res.ok) throw new Error('Failed to load campus vendors');
      return res.json();
    },
    staleTime: 30000,
  });

  // Base list respecting veg/open/search before counting category chips
  const baseMatchedVendors = useMemo(() => {
    if (!vendorsData?.vendors) return [];
    return vendorsData.vendors.filter((vendor) => {
      if (vegOnly && vendor.category === 'raw_chicken') return false;
      if (openOnly && (!vendor.isOpen || vendor.canDeliverToGate === false)) return false;
      if (debouncedQuery.trim()) {
        const q = debouncedQuery.toLowerCase();
        const match =
          vendor.name.toLowerCase().includes(q) ||
          (vendor.description || '').toLowerCase().includes(q) ||
          vendor.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [vendorsData, vegOnly, openOnly, debouncedQuery]);

  const categoryDefs = [
    { id: 'all', label: 'All Canteens' },
    { id: 'meals', label: 'Meals' },
    { id: 'snacks', label: 'Snacks' },
    { id: 'fruits', label: 'Fruits' },
    { id: 'beverages', label: 'Juices & Shakes' },
    { id: 'groceries', label: 'Groceries' },
    { id: 'vegetables', label: 'Vegetables' },
    { id: 'raw_chicken', label: 'Fresh Chicken' },
    { id: 'late_night', label: 'Late Night' },
  ];

  const categoriesWithCounts = useMemo(() => {
    return categoryDefs.map((cat) => ({
      ...cat,
      count:
        cat.id === 'all'
          ? baseMatchedVendors.length
          : baseMatchedVendors.filter((v) => v.category === cat.id).length,
    }));
  }, [baseMatchedVendors]);

  const filteredVendors = useMemo(() => {
    return baseMatchedVendors
      .filter((v) => selectedCategory === 'all' || v.category === selectedCategory)
      .sort((a, b) => {
        if (sortBy === 'rating') return b.ratingAvg - a.ratingAvg;
        return (a.etaMinutes ?? a.prepMinutes) - (b.etaMinutes ?? b.prepMinutes);
      });
  }, [baseMatchedVendors, selectedCategory, sortBy]);

  const openVendors = filteredVendors.filter((v) => v.isOpen && v.canDeliverToGate !== false);
  const closedVendors = filteredVendors.filter((v) => !v.isOpen || v.canDeliverToGate === false);

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 space-y-5">
      <SeoHead
        title="Browse NIT Patna Canteens & Campus Stores | TreFood"
        description="Browse open NIT Patna campus meals, snacks, fruits, groceries, vegetables, and raw chicken filtered live by gate reachability and hostel curfews."
        path="/browse"
      />
      {/* Gate & Curfew Strip */}
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

        <div className="flex items-center gap-2">
          {nightSafeNow && <Badge variant="night_safe">Night Safe Active</Badge>}
          <button
            type="button"
            onClick={() => setGatePickerOpen(true)}
            className="min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3.5 text-xs font-bold text-[var(--color-text)] hover:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
          >
            Change gate
          </button>
        </div>
      </div>

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

      {/* Search Bar */}
      <div className="relative">
        <Input
          placeholder="Search campus canteens, thalis, fruits, groceries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          className="h-12 text-sm shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-2 min-h-[36px] px-2 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category Chips with Live Counts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categoriesWithCounts.map((cat) => (
          <Chip
            key={cat.id}
            label={cat.label}
            count={cat.count}
            disabled={cat.id !== 'all' && cat.count === 0}
            selected={selectedCategory === cat.id}
            onClick={() => setSelectedCategory(cat.id)}
          />
        ))}
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-subtle)] pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip label="Open now" selected={openOnly} onClick={() => setOpenOnly(!openOnly)} />
          <Chip label="Veg friendly" selected={vegOnly} onClick={() => setVegOnly(!vegOnly)} />
        </div>

        <button
          type="button"
          onClick={() => setSortBy(sortBy === 'fastest' ? 'rating' : 'fastest')}
          className="min-h-[44px] rounded-xl px-3 text-xs font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
        >
          Sort: <span className="underline">{sortBy === 'fastest' ? 'Fastest to gate' : 'Top rated'}</span>
        </button>
      </div>

      {/* Open & Closed Vendors Listing */}
      {vendorsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <VendorCardSkeleton />
          <VendorCardSkeleton />
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
          }}
        />
      ) : (
        <div className="space-y-8">
          {openVendors.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[var(--color-text)]">
                  Open Now ({openVendors.length})
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#15803D]" aria-hidden="true" />
                  <span>Zero delivery fee • Verified packets</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {openVendors.map((vendor) => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                    variant="open"
                    onClick={() => navigate(`/vendor/${vendor.slug}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {closedVendors.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Closed right now ({closedVendors.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {closedVendors.map((vendor) => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                    variant="closed"
                    onClick={() => navigate(`/vendor/${vendor.slug}`)}
                    onNotify={() =>
                      showToast(`We will notify you when ${vendor.name} opens for your gate.`, 'success')
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Gate Picker Modal */}
      <GatePicker
        open={gatePickerOpen}
        onClose={() => setGatePickerOpen(false)}
        currentGateId={selectedGateId}
        onSelectGate={(gate: Gate | string) => {
          const id = typeof gate === 'string' ? gate : gate.id;
          setSelectedGateId(id);
          setGatePickerOpen(false);
        }}
      />
    </div>
  );
}
