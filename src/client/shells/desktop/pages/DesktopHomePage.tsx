import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../../../context/CartContext';
import { ResponsiveImage } from '../../../components/ui/ResponsiveImage';
import { DesktopVendorCard } from '../../../components/v2/VendorCard/DesktopVendorCard';
import { DesktopCategoryNav } from '../../../components/v2/CategoryNav/DesktopCategoryNav';
import { DesktopCardSkeleton } from '../../../components/v2/Skeleton/Skeleton';
import { EmptyStateV2 } from '../../../components/v2/EmptyState/EmptyState';
import { ArrowRight, UtensilsCrossed } from 'lucide-react';
import type { VendorSummary } from '@shared/types';

export function DesktopHomePage() {
  const navigate = useNavigate();
  const { selectedGateId } = useCart();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const { data, isLoading } = useQuery<{ ok: boolean; vendors: VendorSummary[] }>({
    queryKey: ['vendors', selectedGateId],
    queryFn: async () => {
      const res = await fetch(`/api/vendors?gateId=${selectedGateId || 'gate_main'}`);
      return res.json();
    },
  });

  const vendors: VendorSummary[] = data?.vendors || [];
  const featuredVendor = vendors.find((v) => v.isOpen) || vendors[0];

  const categories = [
    { id: 'all', name: 'All Counters' },
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
    <div className="space-y-12 pb-16">
      {/* Editorial Hero Strip: One Large 21:9 Hero Card with Quiet Editorial Headline */}
      {featuredVendor && (
        <section
          aria-label="Featured Campus Counter"
          onClick={() => navigate(`/vendor/${featuredVendor.slug}`)}
          className="group relative overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--elevation-2)] hover:shadow-[var(--elevation-3)] transition-all duration-250 cursor-pointer"
        >
          <div className="relative aspect-[21/9] w-full overflow-hidden bg-[var(--color-surface-sunken)]">
            <ResponsiveImage
              src={featuredVendor.coverImageUrl || `/images/vendors/${featuredVendor.slug}.jpg`}
              alt={featuredVendor.name}
              crop="21x9"
              priority
              className="h-full w-full object-cover tf-photo-warm transition-transform duration-500 group-hover:scale-[1.02]"
            />
            {/* Gradient Overlay for Editorial Contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6 text-white">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-[13px] font-bold backdrop-blur-sm">
                  <span>Featured Counter</span>
                  <span>•</span>
                  <span>Zero Delivery Fee</span>
                </div>
                <h1 className="font-display text-[44px] font-bold tracking-tight leading-tight text-white">
                  {featuredVendor.name}
                </h1>
                <p className="text-[17px] text-stone-200 line-clamp-1">
                  {featuredVendor.description || featuredVendor.tagline}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2 font-bold text-[16px] text-[#FFB400] group-hover:translate-x-1 transition-transform">
                <span>Explore Menu</span>
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Category Editorial Nav Strip */}
      <section aria-label="Menu categories">
        <DesktopCategoryNav
          categories={categories}
          activeCategoryId={activeCategory}
          onSelectCategory={setActiveCategory}
        />
      </section>

      {/* The Editorial 3-Column Grid on 1440px / 1280px */}
      <section aria-label="Available Campus Vendors" className="space-y-6">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="font-display text-[32px] font-bold text-[var(--color-text)]">
              Campus Food Counters
            </h2>
            <p className="text-[15px] text-[var(--color-text-muted)] mt-1">
              Prepared fresh by authentic NIT Patna vendors and dropped at your hostel gate.
            </p>
          </div>
          <span className="text-[14px] font-semibold text-[var(--color-text-muted)]">
            Showing {filteredVendors.length} counters
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <DesktopCardSkeleton />
            <DesktopCardSkeleton />
            <DesktopCardSkeleton />
          </div>
        ) : filteredVendors.length === 0 ? (
          <EmptyStateV2
            icon={<UtensilsCrossed className="h-6 w-6" />}
            title="No counters available"
            description="No vendors found in this category right now. Try switching categories or checking another gate."
            actionLabel="View all counters"
            onAction={() => setActiveCategory('all')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredVendors.map((vendor) => (
              <DesktopVendorCard
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

export default DesktopHomePage;
