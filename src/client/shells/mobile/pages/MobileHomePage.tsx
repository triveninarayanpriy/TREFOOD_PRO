import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../../../context/CartContext';
import { MobileCategoryNav } from '../../../components/v2/CategoryNav/MobileCategoryNav';
import { MobileVendorCard } from '../../../components/v2/VendorCard/MobileVendorCard';
import { MobileCardSkeleton } from '../../../components/v2/Skeleton/Skeleton';
import { EmptyStateV2 } from '../../../components/v2/EmptyState/EmptyState';
import { isNightSafetyActive } from '@shared/curfew';
import { ShieldCheck, Search, UtensilsCrossed } from 'lucide-react';
import type { VendorSummary } from '@shared/types';

export function MobileHomePage() {
  const navigate = useNavigate();
  const { selectedGateId } = useCart();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const nightSafety = isNightSafetyActive();

  const { data, isLoading } = useQuery<{ ok: boolean; vendors: VendorSummary[] }>({
    queryKey: ['vendors', selectedGateId],
    queryFn: async () => {
      const res = await fetch(`/api/vendors?gateId=${selectedGateId || 'gate_main'}`);
      return res.json();
    },
  });

  const vendors: VendorSummary[] = data?.vendors || [];

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'meals', name: 'Meals & Biryani', imageUrl: '/images/categories/food.jpg' },
    { id: 'beverages', name: 'Juices & Shakes', imageUrl: '/images/categories/juices.jpg' },
    { id: 'snacks', name: 'Chai & Snacks', imageUrl: '/images/categories/groceries-real.jpg' },
    { id: 'raw_chicken', name: 'Fresh Chicken', imageUrl: '/images/categories/chicken-real.jpg' },
    { id: 'vegetables', name: 'Vegetables', imageUrl: '/images/categories/vegetables-real.jpg' },
  ];

  const filteredVendors = vendors.filter((v) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'beverages') return v.category === 'beverages' || v.category === 'juices';
    return v.category === activeCategory;
  });

  return (
    <div className="space-y-4 pb-8">
      {/* Quick Search Jump */}
      <button
        type="button"
        onClick={() => navigate('/search')}
        className="flex w-full min-h-[44px] items-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-[14px] text-[var(--color-text-muted)] shadow-xs active:bg-[var(--color-surface-sunken)] transition-colors"
      >
        <Search className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
        <span className="truncate">Search NIT Patna dishes, snacks, shakes...</span>
      </button>

      {/* Campus Night Safety Banner */}
      {nightSafety && (
        <div className="flex items-center gap-2.5 rounded-[16px] bg-[#830020]/10 border border-[#830020]/20 p-3 text-[13px] text-[#830020] dark:text-[#FFB400] dark:bg-[#FFB400]/10 dark:border-[#FFB400]/20">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[#830020] dark:text-[#FFB400]" />
          <div className="leading-tight">
            <span className="font-bold">Campus Night Safety Active: </span>
            <span>All post-7 PM gate drops handled personally by senior counter owners.</span>
          </div>
        </div>
      )}

      {/* Category Pills Navigation */}
      <section aria-label="Campus categories">
        <MobileCategoryNav
          categories={categories}
          activeCategoryId={activeCategory}
          onSelectCategory={setActiveCategory}
        />
      </section>

      {/* Vendor List */}
      <section aria-label="Campus Counters" className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="font-display text-[20px] font-bold text-[var(--color-text)]">
            Campus Counters
          </h2>
          <span className="text-[13px] font-semibold text-[var(--color-text-muted)]">
            {filteredVendors.length} open
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <MobileCardSkeleton />
            <MobileCardSkeleton />
            <MobileCardSkeleton />
          </div>
        ) : filteredVendors.length === 0 ? (
          <EmptyStateV2
            icon={<UtensilsCrossed className="h-6 w-6" />}
            title="No counters in this category"
            description="Try choosing another category or clearing filters to view all campus food options."
            actionLabel="View all counters"
            onAction={() => setActiveCategory('all')}
          />
        ) : (
          <div className="space-y-3">
            {filteredVendors.map((vendor) => (
              <MobileVendorCard
                key={vendor.id}
                vendor={vendor}
                onClick={() => navigate(`/vendor/${vendor.slug}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default MobileHomePage;
