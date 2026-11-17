import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../../../context/CartContext';
import { useToast } from '../../../components/ui/Toast';
import { ResponsiveImage } from '../../../components/ui/ResponsiveImage';
import { DesktopVendorCard } from '../../../components/v2/VendorCard/DesktopVendorCard';
import { DesktopCardSkeleton } from '../../../components/v2/Skeleton/Skeleton';
import { EmptyStateV2 } from '../../../components/v2/EmptyState/EmptyState';
import {
  ArrowDown,
  Clock,
  ShieldCheck,
  Plus,
  UtensilsCrossed,
  MapPin,
  Check,
} from 'lucide-react';
import type { VendorSummary } from '@shared/types';
import type { Gate } from '@shared/schemas';

const CATEGORY_TILES = [
  { id: 'meals', name: 'Meals & Biryani', subtitle: 'Dum biryani, thalis & rolls', image: '/images/categories/food.jpg' },
  { id: 'beverages', name: 'Fruits & Juices', subtitle: 'Fresh juices, shakes & lassi', image: '/images/categories/juices.jpg' },
  { id: 'vegetables', name: 'Vegetables', subtitle: 'Fresh greens & campus produce', image: '/images/categories/vegetables-real.jpg' },
  { id: 'groceries', name: 'Groceries', subtitle: 'Daily essentials & cafe packs', image: '/images/categories/groceries-real.jpg' },
  { id: 'raw_chicken', name: 'Fresh Chicken', subtitle: 'Fresh tender meat cuts', image: '/images/categories/chicken-real.jpg' },
];

export function DesktopHomePage() {
  const navigate = useNavigate();
  const { selectedGateId, setSelectedGateId, addItem } = useCart();
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Fetch vendors
  const { data: vendorData, isLoading: vendorsLoading } = useQuery<{
    ok: boolean;
    vendors: VendorSummary[];
    quickPicks?: Array<{
      id?: string;
      name: string;
      vendorSlug: string;
      pricePaise: number;
      imageUrl: string;
      isVeg?: boolean;
    }>;
  }>({
    queryKey: ['vendors', selectedGateId],
    queryFn: async () => {
      const res = await fetch(`/api/vendors?gateId=${selectedGateId || 'gate_main'}`);
      return res.json();
    },
  });

  // Fetch gates
  const { data: gatesData } = useQuery<{ ok: boolean; gates: Gate[] }>({
    queryKey: ['gates'],
    queryFn: async () => {
      const res = await fetch('/api/gates');
      return res.json();
    },
  });

  const vendors: VendorSummary[] = vendorData?.vendors || [];
  const gates: Gate[] = gatesData?.gates || [];
  const quickPicks = vendorData?.quickPicks || [];

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

  const handleQuickAdd = (dish: {
    name: string;
    vendorSlug: string;
    pricePaise: number;
    isVeg?: boolean;
  }) => {
    const parentVendor = vendors.find((v) => v.slug === dish.vendorSlug);
    if (!parentVendor) return;

    addItem(
      { id: parentVendor.id, name: parentVendor.name, slug: parentVendor.slug },
      {
        itemId: `quick_${dish.name.toLowerCase().replace(/\s+/g, '_')}`,
        name: dish.name,
        pricePaise: dish.pricePaise,
        isVeg: dish.isVeg !== false,
      }
    );
    showToast(`Added ${dish.name} to your packet`, 'success');
  };

  return (
    <div className="space-y-24 pb-24">
      {/* SECTION 1: Full-width Editorial Hero with Overlapping Handwritten Packet Chit */}
      <section aria-label="Featured Campus Kitchen" className="relative">
        <div className="relative overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--elevation-3)]">
          <div className="relative aspect-[21/9] w-full overflow-hidden bg-stone-900">
            <ResponsiveImage
              src="/images/banners/campus-hero-banner-1.jpg"
              alt="Campus freshly cooked meals at NIT Patna"
              crop="21x9"
              priority
              className="h-full w-full object-cover tf-photo-warm opacity-90 scale-100 hover:scale-[1.01] transition-transform duration-700"
            />
            {/* Dark gradient edge overlay for maximum readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-950/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />

            {/* Left Content Area */}
            <div className="absolute inset-y-0 left-0 p-10 lg:p-14 flex flex-col justify-between max-w-2xl text-white z-10">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-[13px] font-bold backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Campus Kitchens Active</span>
                  <span>•</span>
                  <span>Zero Delivery Fee</span>
                </div>

                <h1 className="font-display text-[44px] lg:text-[54px] font-bold tracking-tight text-white leading-[1.08]">
                  Real food from campus kitchens, dropped at your hostel gate.
                </h1>

                <p className="text-[17px] text-stone-200 font-normal leading-relaxed">
                  Authentic NIT Patna canteen meals, rolls, and midnight snacks. Pay cash or UPI at the gate by matching the 4-digit packet code.
                </p>
              </div>

              {/* Action Strip: Gate Selector & Browse Menus button */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <a
                  href="#open-now"
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#830020] text-white px-7 py-3.5 text-[15px] font-bold hover:bg-[#680019] shadow-[var(--elevation-2)] hover:shadow-[var(--elevation-3)] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
                >
                  <span>Browse Menus</span>
                  <ArrowDown className="h-4 w-4" />
                </a>

                {/* Gate Selector Pill on Hero */}
                <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/40 px-4 py-3 text-[14px] font-bold text-white backdrop-blur-md">
                  <MapPin className="h-4 w-4 text-[#FFB400]" />
                  <span>Delivering to {currentGate.name}</span>
                </div>
              </div>
            </div>

            {/* Right Overlapping Physical Handwritten Packet Chit */}
            <div className="hidden lg:block absolute bottom-8 right-12 z-20">
              <div
                className="w-72 rounded-[16px] bg-[#FFFDF9] border border-stone-300 p-5 shadow-2xl rotate-[-3deg] hover:rotate-0 transition-transform duration-300 text-stone-900 font-sans select-none"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent, transparent 27px, #e8dfd8 28px)',
                }}
              >
                <div className="flex items-center justify-between border-b border-stone-300 pb-2 mb-3">
                  <span className="font-mono text-[13px] font-black uppercase tracking-wider text-[#830020]">
                    TreFood Chit
                  </span>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[13px] font-bold">
                    Pay at Gate
                  </span>
                </div>

                <div className="text-center py-2">
                  <div className="text-[13px] uppercase font-bold text-stone-500 tracking-wider">
                    Handover Code
                  </div>
                  <div className="font-caveat font-bold text-[48px] text-[#830020] tracking-widest leading-none my-1">
                    #4812
                  </div>
                  <div className="text-[13px] text-stone-600 font-medium">
                    Match 4 digits on packet
                  </div>
                </div>

                <div className="border-t border-stone-300 pt-2.5 mt-2 flex justify-between items-center text-[13px] text-stone-600 font-semibold">
                  <span>Zero delivery fee</span>
                  <span>NIT Patna Gate Drop</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Gate Board Strip (Each gate with live status and curfew countdown) */}
      <section aria-label="Campus Gate Status Board" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="font-display text-[26px] font-bold text-[var(--color-text)]">
              Campus Gate Drop Status
            </h2>
            <p className="text-[14px] text-[var(--color-text-muted)]">
              Select your pickup point. Curfews strictly enforced in Asia/Kolkata (IST) time.
            </p>
          </div>
          <span className="text-[13px] font-semibold text-[var(--color-text-muted)]">
            Asia/Kolkata Time (IST)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {gates.map((g) => {
            const isSelected = g.id === selectedGateId;
            const is24x7 = g.is24x7 || g.curfewTime === '23:59' || g.curfewTime.toLowerCase() === '24x7';
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGateId(g.id)}
                className={`flex flex-col justify-between p-5 rounded-[20px] border text-left transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'border-[#830020] bg-[var(--color-surface)] shadow-[var(--elevation-2)] ring-2 ring-[#830020]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[#830020] hover:bg-[var(--color-surface-sunken)] shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-display text-[18px] font-bold text-[var(--color-text)]">
                      {g.name}
                    </div>
                    <div className="text-[13px] text-[var(--color-text-muted)]">
                      ~{g.travelMinutes || 8}m drop travel • {g.bufferMinutes || 15}m packet window
                    </div>
                  </div>
                  {isSelected && (
                    <span className="h-6 w-6 rounded-full bg-[#830020] text-white flex items-center justify-center shrink-0">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-[13px]">
                  {is24x7 ? (
                    <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Open 24x7 (Night Drop Ready)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-400">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      <span>Curfew {g.curfewTime} IST</span>
                    </span>
                  )}
                  <span className="text-[var(--color-text-muted)] font-semibold">
                    {isSelected ? 'Active Gate' : 'Select'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: "Open Now" 3-Column Grid with Quiet Closed Row Below */}
      <section id="open-now" aria-label="Open Food Counters" className="space-y-8">
        <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 px-3 py-1 text-[13px] font-bold mb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Accepting Orders Now</span>
            </div>
            <h2 className="font-display text-[32px] font-bold text-[var(--color-text)]">
              Open Campus Kitchens
            </h2>
          </div>
          <span className="text-[14px] font-semibold text-[var(--color-text-muted)]">
            Showing {filteredOpenVendors.length} active counters
          </span>
        </div>

        {vendorsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <DesktopCardSkeleton />
            <DesktopCardSkeleton />
            <DesktopCardSkeleton />
          </div>
        ) : filteredOpenVendors.length === 0 ? (
          <EmptyStateV2
            icon={<UtensilsCrossed className="h-8 w-8" />}
            title="All canteens currently closed"
            description="Our kitchens reopen according to their morning hours. Check Main Gate or scheduled delivery."
            actionLabel="Reset Category"
            onAction={() => setActiveCategory('all')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredOpenVendors.map((vendor) => (
              <DesktopVendorCard
                key={vendor.id}
                vendor={vendor}
                onClick={() => navigate(`/vendor/${vendor.slug}`)}
              />
            ))}
          </div>
        )}

        {/* Quiet Single Row for Closed Vendors */}
        {closedVendors.length > 0 && (
          <div className="pt-8 border-t border-[var(--color-border)] space-y-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-[16px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Opening Later Today ({closedVendors.length})
              </h3>
              <span className="text-[13px] text-[var(--color-text-muted)]">
                Accepting scheduled orders within operating hours
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {closedVendors.map((v) => {
                const hours = v.hoursJson ? JSON.parse(v.hoursJson) : null;
                const opensAt = hours?.open ? `${hours.open} IST` : '10:00 IST';
                return (
                  <div
                    key={v.id}
                    onClick={() => navigate(`/vendor/${v.slug}`)}
                    className="flex items-center gap-3.5 p-3.5 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface)] hover:border-[#830020] transition-colors cursor-pointer group"
                  >
                    <div className="h-12 w-12 rounded-[10px] overflow-hidden bg-stone-300 shrink-0">
                      <ResponsiveImage
                        src={v.coverImageUrl || `/images/vendors/${v.slug}.jpg`}
                        alt={v.name}
                        crop="1x1"
                        className="h-full w-full object-cover grayscale opacity-75 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[14px] text-[var(--color-text)] truncate group-hover:text-[#830020] transition-colors">
                        {v.name}
                      </div>
                      <div className="text-[13px] text-[var(--color-text-muted)] truncate">
                        Opens at {opensAt}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 4: Category Photo Tiles in a 5-Column Row */}
      <section aria-label="Campus Menu Categories" className="space-y-6">
        <div>
          <h2 className="font-display text-[26px] font-bold text-[var(--color-text)]">
            Explore by Cravings
          </h2>
          <p className="text-[14px] text-[var(--color-text-muted)]">
            Freshly harvested campus categories across NIT Patna.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-6">
          {CATEGORY_TILES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                const target = document.getElementById('open-now');
                if (target) target.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group relative overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs hover:shadow-[var(--elevation-2)] hover:border-[#830020] hover:-translate-y-1 transition-all duration-200 text-left cursor-pointer"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-200">
                <ResponsiveImage
                  src={cat.image}
                  alt={cat.name}
                  crop="4x3"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <div className="font-display text-[16px] font-bold leading-snug">
                    {cat.name}
                  </div>
                </div>
              </div>
              <div className="p-3 bg-[var(--color-surface)]">
                <p className="text-[13px] text-[var(--color-text-muted)] truncate">
                  {cat.subtitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* SECTION 5: "Popular Dishes" (4-column grid of 1:1 photos with price and one-click add) */}
      {quickPicks.length > 0 && (
        <section aria-label="Popular Dishes" className="space-y-6">
          <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFB400]/20 text-[#830020] dark:text-[#FFB400] px-3 py-1 text-[13px] font-bold mb-2">
                <span>Top Campus Picks</span>
              </div>
              <h2 className="font-display text-[26px] font-bold text-[var(--color-text)]">
                Quick Bite Favorites
              </h2>
            </div>
            <span className="text-[14px] text-[var(--color-text-muted)] font-semibold">
              Instant One-Click Packet Add
            </span>
          </div>

          <div className="grid grid-cols-4 gap-6">
            {quickPicks.slice(0, 8).map((dish) => {
              const rupeePrice = `₹${Math.round(dish.pricePaise / 100)}`;
              return (
                <div
                  key={dish.name}
                  className="group flex flex-col justify-between overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs hover:shadow-[var(--elevation-2)] hover:border-[#830020] hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="relative aspect-[1/1] w-full overflow-hidden bg-stone-100">
                    <ResponsiveImage
                      src={dish.imageUrl}
                      alt={dish.name}
                      crop="1x1"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-2.5 left-2.5 rounded-full bg-white/90 backdrop-blur-xs px-2.5 py-0.5 text-[13px] font-bold text-[#830020] shadow-xs">
                      {dish.vendorSlug.replace(/-/g, ' ')}
                    </div>
                  </div>

                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-display text-[17px] font-bold text-[var(--color-text)] leading-snug">
                        {dish.name}
                      </h4>
                      <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">
                        Authentic recipe • Zero fee
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-subtle)]">
                      <span className="text-[18px] font-extrabold text-[var(--color-text)]">
                        {rupeePrice}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(dish)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#830020] text-white px-4 py-2 text-[13px] font-bold hover:bg-[#680019] shadow-xs active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 6: Campus Night Safety Block */}
      <section aria-label="Campus Night Safety Guidance">
        <div className="relative overflow-hidden rounded-[24px] border border-[#830020]/30 bg-gradient-to-br from-[#830020]/10 via-[var(--color-surface)] to-[var(--color-surface)] p-8 lg:p-10 shadow-[var(--elevation-1)] flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-start gap-5 max-w-3xl">
            <div className="h-14 w-14 rounded-[16px] bg-[#830020] text-white flex items-center justify-center shrink-0 shadow-md">
              <ShieldCheck className="h-7 w-7 text-[#FFB400]" />
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-[#830020] dark:text-[#FFB400]">
                NIT Patna Safety Protocol
              </div>
              <h3 className="font-display text-[22px] font-bold text-[var(--color-text)]">
                Campus Night Safety Certified Deliveries
              </h3>
              <p className="text-[15px] text-[var(--color-text-muted)] leading-relaxed">
                After 7:00 PM IST (19:00), deliveries to NIT Patna gates are handled personally by the restaurant owner, co-owner, or senior staff with complete trust. Curfew rules apply strictly at hostel gates (19:30 IST) while Main Gate / Academic Blocks remain open 24x7.
              </p>
            </div>
          </div>

          <div className="shrink-0 text-center md:text-right">
            <div className="font-caveat font-bold text-[28px] text-[#830020] dark:text-[#FFB400]">
              Zero Delivery Fee Always
            </div>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">
              Pay ₹ at gate after verifying 4 digits
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DesktopHomePage;
