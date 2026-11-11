import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../context/CartContext';
import { SeoHead } from '../components/seo/SeoHead';
import { Button } from '../components/ui/Button';
import { GateBoard } from '../components/ui/GateBoard';
import { VendorCounterRow } from '../components/ui/VendorCounterRow';
import { PacketChit } from '../components/ui/PacketChit';
import { Skeleton } from '../components/ui/Skeleton';
import {
  ShieldCheck,
  Search,
  MapPin,
  ArrowRight,
  ChevronDown,
  MessageCircle,
  Clock,
} from 'lucide-react';
import type { CampusSummaryResponse, VendorSummary } from '@shared/types';
import type { Gate } from '@shared/schemas';

const VendorOnboardingSection = lazy(() =>
  import('../components/landing/VendorOnboardingSection').then((m) => ({
    default: m.VendorOnboardingSection,
  }))
);

const HOW_IT_GOES_STEPS = [
  {
    step: '01',
    title: 'Pick a gate',
    desc: 'Check live curfew times for Main Gate, Boys Hostel Gate, or Girls Hostel Gate before browsing.',
    img: '/images/steps/step-1-gate.png',
    alt: 'TreFood NIT Patna campus gate departure board showing Main Gate open 24x7 and hostel gate curfew',
  },
  {
    step: '02',
    title: 'Order from an open vendor',
    desc: 'Browse real NIT Patna counters and add chai, biryani, fruit, or snacks with zero login wall.',
    img: '/images/steps/step-2-vendor.png',
    alt: 'TreFood open campus vendor counter row showing real photos, prep time, and minimum order',
  },
  {
    step: '03',
    title: 'Wait at the gate',
    desc: 'Follow kitchen progress from Placed to At Gate. Pay Cash or UPI after inspecting your bag.',
    img: '/images/steps/step-3-track.png',
    alt: 'TreFood printed packet bill showing zero delivery fee and itemised total',
  },
  {
    step: '04',
    title: 'Match the 4-digit code',
    desc: 'Compare the handwritten marker digits on the sealed packet with your Packet Chit to collect.',
    img: '/images/steps/step-4-code.png',
    alt: 'TreFood Packet Chit displaying handwritten 4-digit handover code 4821',
  },
] as const;

const CAMPUS_CATEGORIES = [
  {
    id: 'food',
    name: 'Food',
    starting: 'From ₹12',
    sub: 'Meals, biryani, pizza, rolls & momos',
    img: '/images/categories/food-cat.png',
    to: '/app?category=meals',
  },
  {
    id: 'fruits_juices',
    name: 'Fruits & Juices',
    starting: 'From ₹49',
    sub: 'Shakes, lassi, citrus & chilled juices',
    img: '/images/categories/fruits-cat.png',
    to: '/app/search?q=shake',
  },
  {
    id: 'groceries',
    name: 'Groceries',
    starting: 'From ₹15',
    sub: 'Chai, coffee, Maggi, milk & quick snacks',
    img: '/images/categories/groceries-cat.png',
    to: '/app?category=snacks',
  },
  {
    id: 'raw_chicken',
    name: 'Fresh Chicken',
    starting: 'From ₹79',
    sub: 'Chicken biryani, rolls, soup & boneless cuts',
    img: '/images/categories/chicken-cat.png',
    to: '/app/search?q=chicken',
  },
  {
    id: 'vegetables',
    name: 'Vegetables',
    starting: 'Opening soon',
    sub: 'Fresh hostel cooking vegetables',
    img: '/images/categories/vegetables-cat.png',
    to: '/app/search?q=veg',
  },
] as const;

const HOSTEL_FAQS = [
  {
    q: 'What time do hostel gates close on TreFood?',
    a: 'Boys Hostel Gate and Girls Hostel Gate close at 19:30 IST (7:30 PM). Main Gate and Academic Blocks stay open 24×7. Orders close 15 minutes before curfew plus vendor prep time.',
  },
  {
    q: 'Do I pay online or at the hostel gate?',
    a: 'You pay at the gate via Cash or UPI after inspecting your packet and checking the 4-digit handover code. No online pre-payment is required.',
  },
  {
    q: 'How does the 4-digit packet code work?',
    a: 'Each accepted order gets a random 4-digit number unique among active orders at that gate. The kitchen writes it on the sealed bag; confirm those 4 digits match yours before handover.',
  },
  {
    q: 'What if something is wrong or missing from my bag?',
    a: 'Check the sealed packet before paying at the gate. If an item is missing or cold afterward, submit a quick issue from your order screen (/orders) for counter resolution.',
  },
  {
    q: 'Who handles deliveries after 7:00 PM?',
    a: 'After 19:00 IST, all campus orders are brought personally by the shop owner, co-owner, or verified senior kitchen staff — never unknown outside couriers.',
  },
  {
    q: 'Why is there zero delivery fee?',
    a: 'Every counter listed on TreFood serves NIT Patna within short campus gate walking distance, avoiding third-party rider commissions so you pay menu counter prices.',
  },
] as const;

const LANDING_JSON_LD = [
  {
    '@type': 'Organization',
    name: 'TreFood',
    url: 'https://trefood-prototype.technicaltriveniyt.workers.dev',
    logo: 'https://trefood-prototype.technicaltriveniyt.workers.dev/icon-512.png',
    areaServed: 'National Institute of Technology Patna',
  },
  {
    '@type': 'LocalBusiness',
    name: 'TreFood NIT Patna',
    url: 'https://trefood-prototype.technicaltriveniyt.workers.dev',
    image: 'https://trefood-prototype.technicaltriveniyt.workers.dev/og-image.png',
    priceRange: '₹0 Delivery Fee',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Ashok Rajpath, Mahendru',
      addressLocality: 'Patna',
      addressRegion: 'BR',
      postalCode: '800005',
      addressCountry: 'IN',
    },
  },
];

interface SearchSuggestResult {
  vendors: Array<{ id: string; slug: string; name: string; category: string; isOpen: boolean }>;
  items: Array<{ id: string; vendorId: string; name: string; pricePaise: number; inStock: boolean }>;
}

export function LandingPage() {
  const navigate = useNavigate();
  const { selectedGateId, setSelectedGateId } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [notifiedVendors, setNotifiedVendors] = useState<Record<string, boolean>>({});

  // Live NIT Patna gates
  const { data: campusData, isLoading: campusLoading } = useQuery<CampusSummaryResponse>({
    queryKey: ['campus', 'nitp'],
    queryFn: async () => {
      const res = await fetch('/api/campuses/nitp');
      if (!res.ok) throw new Error('Failed to load campus gates');
      return res.json();
    },
    staleTime: 30000,
  });

  const gates: Gate[] = campusData?.gates || [];
  const activeGateId =
    gates.some((g) => g.id === selectedGateId) ? selectedGateId : gates[0]?.id || selectedGateId;

  // Real open & closed campus counters for the chosen gate
  const { data: vendorsData, isLoading: vendorsLoading } = useQuery<{
    ok: boolean;
    vendors: VendorSummary[];
  }>({
    queryKey: ['landing-vendors', activeGateId],
    queryFn: async () => {
      const params = new URLSearchParams({ campus: 'nitp' });
      if (activeGateId) params.set('gateId', activeGateId);
      const res = await fetch(`/api/vendors?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load campus counters');
      return res.json();
    },
    staleTime: 30000,
  });

  // Search autocomplete backed by /api/search/suggest
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok: boolean;
          vendors: SearchSuggestResult['vendors'];
          items: SearchSuggestResult['items'];
        };
        if (data.ok) {
          setSuggestions({ vendors: data.vendors, items: data.items });
        }
      } catch {
        // Ignore transient network errors while typing
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowSuggestions(false);
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate(`/app/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/app');
    }
  }

  const allVendors = vendorsData?.vendors || [];
  const openVendors = allVendors.filter((v) => v.isOpen && v.canDeliverToGate !== false);
  const closedVendors = allVendors.filter((v) => !v.isOpen || v.canDeliverToGate === false);
  const previewVendors = [...openVendors.slice(0, 3), ...closedVendors.slice(0, 2)];

  return (
    <div className="space-y-14 sm:space-y-20 pb-12">
      <SeoHead
        title="TreFood | NIT Patna Campus Gate Delivery"
        description="Midnight chai and hot food at your NIT Patna hostel gate. Zero delivery fee, pay at the gate after matching your 4-digit packet code."
        path="/"
        jsonLd={LANDING_JSON_LD}
      />

      {/* SECTION 2: HERO (Split Editorial Warm Paper Layout) */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left column */}
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#830020] dark:text-[#FFB400]">
                <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span>NIT Patna · Campus Gate Delivery</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.35rem] font-extrabold leading-[1.06] tracking-tight text-[var(--color-text)]">
                Midnight chai and hot food, at your hostel gate.
              </h1>

              <p className="max-w-xl text-base sm:text-[17px] leading-relaxed text-[var(--color-text-muted)]">
                Zero delivery fee. Pay at the gate after you check your 4-digit packet code. Built
                around NIT Patna curfews.
              </p>

              {/* Quick Gate Select + Primary CTA */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-1">
                <div className="sm:min-w-[235px]">
                  <label
                    htmlFor="hero-gate-select"
                    className="mb-1 block text-xs font-semibold text-[var(--color-text)]"
                  >
                    Delivery gate
                  </label>
                  <select
                    id="hero-gate-select"
                    value={activeGateId}
                    onChange={(e) => setSelectedGateId(e.target.value)}
                    aria-label="Choose your NIT Patna hostel or campus gate"
                    className="w-full min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-text)] focus:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
                  >
                    {gates.length === 0 ? (
                      <option value="gate_main">Main Gate / Academic Blocks</option>
                    ) : (
                      gates.map((gate) => (
                        <option key={gate.id} value={gate.id}>
                          {gate.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <Button
                  type="button"
                  variant="amber"
                  size="lg"
                  onClick={() => navigate('/app')}
                  className="shrink-0"
                >
                  <span>Browse open menus</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              {/* Clean campus search */}
              <div className="relative max-w-xl pt-1">
                <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <label htmlFor="hero-search-input" className="sr-only">
                      Search campus dishes and counters
                    </label>
                    <Search
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
                      aria-hidden="true"
                    />
                    <input
                      id="hero-search-input"
                      type="search"
                      value={searchQuery}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => window.setTimeout(() => setShowSuggestions(false), 180)}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      placeholder="Search biryani, chai, momos, dosa..."
                      className="w-full min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
                    />
                  </div>
                  <Button type="submit" variant="secondary" size="md">
                    Search
                  </Button>
                </form>

                {showSuggestions &&
                  suggestions &&
                  (suggestions.vendors.length > 0 || suggestions.items.length > 0) && (
                    <div
                      role="listbox"
                      aria-label="Campus search suggestions"
                      className="absolute left-0 right-0 z-30 mt-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-lg space-y-1"
                    >
                      {suggestions.vendors.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onMouseDown={() => navigate(`/app/vendor/${v.slug}`)}
                          className="flex min-h-[44px] w-full items-center justify-between rounded-lg px-3 text-left text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)]"
                        >
                          <span>{v.name}</span>
                          <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
                            {v.isOpen ? 'Open' : 'Closed'}
                          </span>
                        </button>
                      ))}
                      {suggestions.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={() =>
                            navigate(`/app/search?q=${encodeURIComponent(item.name)}`)
                          }
                          className="flex min-h-[44px] w-full items-center justify-between rounded-lg px-3 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)]"
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="font-mono font-bold text-[#830020] dark:text-[#FFB400]">
                            ₹{Math.round(item.pricePaise / 100)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            {/* Right column: Authentic campus food photo + overlapping PacketChit */}
            <div className="lg:col-span-6">
              <div className="relative pb-6 sm:pb-8 sm:pr-4">
                <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
                  <img
                    src="/images/items/kolkata-biryani-fast-food-pizza-house--nawab-dum-biryani.webp"
                    alt="Nawab Dum Biryani served hot from Kolkata Biryani Fast-Food Pizza House near NIT Patna"
                    width={640}
                    height={480}
                    decoding="async"
                    fetchPriority="high"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>

                {/* PacketChit overlapping bottom-right */}
                <div className="mt-4 sm:mt-0 sm:absolute sm:bottom-0 sm:right-0 sm:w-[310px]">
                  <PacketChit
                    orderNo="TF-4821"
                    handoverCode="4821"
                    vendorName="Kolkata Biryani Fast-Food"
                    gateName="Main Gate / Academic Blocks"
                    status="at_gate"
                    etaMinutes={18}
                    totalPaise={12900}
                    itemSummary="1 × Nawab Dum Biryani"
                    chitNote="Match packet marker before paying"
                  />
                </div>
              </div>

              <p className="mt-2 text-xs font-medium text-[var(--color-text-muted)]">
                Nawab Dum Biryani · Kolkata Biryani Fast-Food Pizza House ·{' '}
                <span className="font-mono font-bold text-[var(--color-text)]">₹129</span> · ₹0
                delivery fee
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: CAMPUS GATE BOARD */}
      <section id="gates" aria-labelledby="gate-board-heading" className="mx-auto max-w-6xl px-4 space-y-3 scroll-mt-20">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="gate-board-heading" className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
            Campus gate curfew board
          </h2>
          <span className="font-mono text-xs text-[var(--color-text-muted)]">
            Select a gate to filter counters
          </span>
        </div>

        {campusLoading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : (
          <GateBoard
            gates={gates}
            selectedGateId={activeGateId}
            onSelectGate={(g) => setSelectedGateId(g.id)}
          />
        )}

        <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <Clock className="h-3.5 w-3.5 shrink-0 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
          <span>
            Hostel gates close at 19:30 IST. Main Gate and Academic Blocks stay open 24×7.
          </span>
        </p>
      </section>

      {/* SECTION 4: OPEN RIGHT NOW NEAR NIT PATNA */}
      <section
        id="vendors-on-campus"
        aria-labelledby="open-vendors-heading"
        className="mx-auto max-w-6xl px-4 space-y-4 scroll-mt-20"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="open-vendors-heading"
              className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]"
            >
              Open right now near NIT Patna
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--color-text-muted)]">
              Real campus counters serving{' '}
              <span className="font-semibold text-[var(--color-text)]">
                {gates.find((g) => g.id === activeGateId)?.name || 'Main Gate / Academic Blocks'}
              </span>
              . Closed stalls appear below with opening hours.
            </p>
          </div>
          <Link
            to="/app"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-[#830020] hover:underline dark:text-[#FFB400]"
          >
            <span>See all NIT Patna counters</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {vendorsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
            {previewVendors.map((vendor) => (
              <VendorCounterRow
                key={vendor.id}
                vendor={vendor}
                isNotified={Boolean(notifiedVendors[vendor.id])}
                onClick={() => navigate(`/app/vendor/${vendor.slug}`)}
                onPreOrder={() => navigate(`/app/vendor/${vendor.slug}`)}
                onNotify={() =>
                  setNotifiedVendors((prev) => ({
                    ...prev,
                    [vendor.id]: !prev[vendor.id],
                  }))
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* SECTION 5: HOW AN ORDER ACTUALLY GOES */}
      <section
        id="how-it-works"
        aria-labelledby="how-it-works-heading"
        style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 380px' }}
        className="mx-auto max-w-6xl px-4 space-y-5 scroll-mt-20"
      >
        <div className="space-y-1">
          <h2
            id="how-it-works-heading"
            className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]"
          >
            How an order actually goes
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
            Four steps from choosing a campus gate to matching the marker code on your bag.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HOW_IT_GOES_STEPS.map((item) => (
            <article
              key={item.step}
              className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col"
            >
              <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-2">
                <img
                  src={item.img}
                  alt={item.alt}
                  width={480}
                  height={360}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/3] w-full rounded-lg object-cover object-top"
                />
              </div>
              <div className="p-4 space-y-1.5 flex-1">
                <div className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#830020] dark:text-[#FFB400]">
                  Step {item.step}
                </div>
                <h3 className="font-display text-base font-extrabold text-[var(--color-text)]">
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">{item.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* SECTION 6: WHAT'S ON CAMPUS TODAY */}
      <section
        aria-labelledby="categories-heading"
        className="mx-auto max-w-6xl px-4 space-y-5"
      >
        <div className="space-y-1">
          <h2
            id="categories-heading"
            className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]"
          >
            What&apos;s on campus today
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
            Browse real NIT Patna categories — hot meals, juices, daily snacks, and chicken counters.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {CAMPUS_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={cat.to}
              className="group overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] hover:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              <div className="overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
                <img
                  src={cat.img}
                  alt={cat.name}
                  width={360}
                  height={270}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover tf-photo-warm transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-3.5 space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-base font-extrabold text-[var(--color-text)]">
                    {cat.name}
                  </h3>
                  <span className="font-mono text-xs font-bold text-[#830020] dark:text-[#FFB400] shrink-0">
                    {cat.starting}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">{cat.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 7: AFTER 7 PM: CAMPUS NIGHT SAFETY */}
      <section
        id="safety"
        aria-labelledby="night-safety-heading"
        style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 260px' }}
        className="mx-auto max-w-6xl px-4 scroll-mt-20"
      >
        <div className="rounded-2xl border border-[var(--color-border)] border-l-4 border-l-[#830020] bg-[var(--color-surface)] p-6 sm:p-8 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-3">
              <div className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#830020] dark:text-[#FFB400]">
                <ShieldCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>After 7 PM · Campus Night Safety</span>
              </div>
              <h2
                id="night-safety-heading"
                className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]"
              >
                Known counter staff at the gate after dusk.
              </h2>
              <blockquote className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4 text-sm sm:text-base font-medium leading-relaxed text-[var(--color-text)]">
                “Campus Night Safety: After 7:00 PM, deliveries are handled personally by the vendor
                owner, co-owner, or senior staff with complete trust to ensure campus premises
                safety.”
              </blockquote>
            </div>

            <div className="lg:col-span-5 space-y-3 border-t lg:border-t-0 lg:border-l border-[var(--color-border)] pt-4 lg:pt-0 lg:pl-6 text-xs sm:text-sm text-[var(--color-text-muted)]">
              <div>
                <div className="font-bold text-[var(--color-text)]">
                  Curfew cut-off checked server-side
                </div>
                <p className="mt-0.5 leading-relaxed">
                  Checkout adds vendor prep, gate walk time, and a 15-minute window before 19:30 IST
                  for hostel gates.
                </p>
              </div>
              <div>
                <div className="font-bold text-[var(--color-text)]">
                  4-digit code verification lock
                </div>
                <p className="mt-0.5 leading-relaxed">
                  Five incorrect guesses lock verification until the vendor counter confirms your
                  identity in person.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: COMMON QUESTIONS FROM HOSTELS */}
      <section
        id="faq"
        aria-labelledby="faq-heading"
        style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 420px' }}
        className="mx-auto max-w-3xl px-4 scroll-mt-20 space-y-5"
      >
        <div className="space-y-1">
          <h2
            id="faq-heading"
            className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]"
          >
            Common questions from hostels
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
            Straight answers on gate curfews, pay-at-gate handover, and packet codes.
          </p>
        </div>

        <div className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 sm:px-6 shadow-[var(--shadow-card)]">
          {HOSTEL_FAQS.map((item, idx) => {
            const isOpen = openFaq === idx;
            const panelId = `faq-panel-${idx}`;
            const buttonId = `faq-btn-${idx}`;
            return (
              <div key={item.q} className="py-1">
                <h3 className="m-0">
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex min-h-[48px] w-full items-center justify-between gap-3 py-3 text-left text-sm font-bold text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                {isOpen && (
                  <p
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="pb-4 text-xs sm:text-sm leading-relaxed text-[var(--color-text-muted)]"
                  >
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 9: FOR CAMPUS VENDORS */}
      <Suspense fallback={<div className="mx-auto max-w-6xl px-4 h-72" />}>
        <VendorOnboardingSection />
      </Suspense>

      {/* SECTION 10: FOOTER */}
      <footer
        style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 200px' }}
        className="border-t border-[var(--color-border)] bg-[var(--color-surface)] pt-10 pb-12"
      >
        <div className="mx-auto max-w-6xl px-4 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <img
                  src="/images/brand/trefood-brand-logo.jpg"
                  alt=""
                  width={32}
                  height={32}
                  loading="lazy"
                  decoding="async"
                  className="h-8 w-8 rounded-lg object-cover border border-[var(--color-border)]"
                />
                <span className="font-display text-lg font-extrabold tracking-tight text-[#830020] dark:text-[#FFB400]">
                  TreFood
                </span>
                <span className="font-mono text-xs font-semibold text-[var(--color-text-muted)]">
                  · NIT Patna
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Ashok Rajpath, Mahendru, Patna 800005 · Zero delivery fee · 4-digit gate code
              </p>
            </div>

            <nav
              aria-label="Footer navigation"
              className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-[var(--color-text)]"
            >
              <Link
                to="/about"
                className="inline-flex min-h-[44px] items-center hover:text-[#830020] dark:hover:text-[#FFB400]"
              >
                About
              </Link>
              <Link
                to="/terms"
                className="inline-flex min-h-[44px] items-center hover:text-[#830020] dark:hover:text-[#FFB400]"
              >
                Terms
              </Link>
              <Link
                to="/privacy"
                className="inline-flex min-h-[44px] items-center hover:text-[#830020] dark:hover:text-[#FFB400]"
              >
                Privacy
              </Link>
              <Link
                to="/refunds"
                className="inline-flex min-h-[44px] items-center hover:text-[#830020] dark:hover:text-[#FFB400]"
              >
                Refunds
              </Link>
              <a
                href="https://wa.me/919999999999?text=Hi%20TreFood%20NIT%20Patna%20team"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 hover:text-[#830020] dark:hover:text-[#FFB400]"
              >
                <MessageCircle
                  className="h-4 w-4 text-[#15803D] dark:text-[#86EFAC]"
                  aria-hidden="true"
                />
                <span>Contact (WhatsApp)</span>
              </a>
              <Link
                to="/v"
                className="inline-flex min-h-[44px] items-center text-[var(--color-text-muted)] hover:underline"
              >
                Vendor Console
              </Link>
              <Link
                to="/admin"
                className="inline-flex min-h-[44px] items-center text-[var(--color-text-muted)] hover:underline"
              >
                Admin
              </Link>
            </nav>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-[var(--color-border)] pt-5 text-xs text-[var(--color-text-muted)]">
            <span>
              © 2026 TreFood NIT Patna Prototype · Menus reflect captured campus data · Support:
              support@trefood.in
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
