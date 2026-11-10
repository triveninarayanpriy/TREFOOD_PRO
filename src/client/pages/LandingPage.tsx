import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../context/CartContext';
import { SeoHead } from '../components/seo/SeoHead';
import { Button } from '../components/ui/Button';
import { HandoverTicket } from '../components/ui/HandoverTicket';
import { CurfewMiniDemo } from '../components/landing/CurfewMiniDemo';
import { VendorOnboardingSection } from '../components/landing/VendorOnboardingSection';
import { getGateCurfewStatus, isNightSafetyActive } from '@shared/curfew';
import type { CampusSummaryResponse } from '@shared/types';
import type { Gate } from '@shared/schemas';
import {
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronDown,
  ShoppingBag,
  ArrowRight,
  MessageCircle,
  Search,
  MapPin,
  Wifi,
  LockKeyhole,
  CheckCircle2,
  Star,
  Store,
} from 'lucide-react';

const STATUS_SEQUENCE = [
  { key: 'placed', label: 'Placed', detail: 'Ticket generated • waiting vendor accept' },
  { key: 'accepted', label: 'Accepted', detail: 'Kitchen preparing fresh hot packet' },
  { key: 'out_for_delivery', label: 'On Route', detail: 'Staff heading toward selected gate' },
  { key: 'at_gate', label: 'At Gate', detail: 'Match 4-digit packet code & pay ₹160' },
] as const;

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Pick your hostel gate',
    desc: 'Choose Main Gate / Academic Blocks (24x7) or Boys / Girls Hostel Gates (19:30 IST curfew). We calculate reachability automatically.',
    badge: 'Curfew-Aware',
  },
  {
    step: '02',
    title: 'Browse menus as a guest',
    desc: 'Explore all 12 campus shops across hot meals, fresh fruit, groceries, and raw chicken without forcing a login wall.',
    badge: 'Guest Ready',
  },
  {
    step: '03',
    title: 'Zero-fee campus checkout',
    desc: 'Quick @nitp.ac.in OTP check only when placing an order. ₹0 delivery fee, offline cart backup, idempotent retry safety.',
    badge: '₹0 Delivery Fee',
  },
  {
    step: '04',
    title: 'Match 4-digit packet code',
    desc: 'Meet at the gate, verify the 4 digits written on your sealed packet, pay via Cash or UPI, and tap Confirm Handover.',
    badge: 'Verified Handoff',
  },
] as const;

const CAMPUS_CATEGORIES = [
  { id: 'meals', name: 'Meals & Thali', img: '/images/meals.svg' },
  { id: 'snacks', name: 'Snacks & Chai', img: '/images/snacks.svg' },
  { id: 'fruits', name: 'Fresh Fruits', img: '/images/fruits.svg' },
  { id: 'groceries', name: 'Daily Groceries', img: '/images/groceries.svg' },
  { id: 'vegetables', name: 'Vegetables', img: '/images/vegetables.svg' },
  { id: 'raw_chicken', name: 'Raw Chicken', img: '/images/raw-chicken.svg' },
  { id: 'late_night', name: 'Late Night', img: '/images/late-night.svg' },
  { id: 'beverages', name: 'Beverages', img: '/images/beverages.svg' },
] as const;

const SAMPLE_TESTIMONIALS = [
  {
    quote:
      'Picked Boys Hostel Gate at 7:05 PM and got a warning that curfew was too tight—switched to Main Gate 24x7 in one click instead of having my dinner cancelled.',
    author: 'Rohan V. (Sample)',
    meta: '3rd Year CSE • Hostel 5 (Demo Testimonial)',
  },
  {
    quote:
      'Getting hygienically sealed raw chicken and fresh bananas on campus without paying ₹45 delivery fees makes hostel cooking viable every week.',
    author: 'Ananya S. (Sample)',
    meta: '2nd Year ECE • Girls Hostel (Demo Testimonial)',
  },
  {
    quote:
      'Matching the 4-digit code at the gate eliminates mixed-up packets during the 9 PM rush at Ganga Canteen.',
    author: 'Karthik M. (Sample)',
    meta: 'M.Tech Civil • Main Gate Pickup (Demo Testimonial)',
  },
] as const;

const FAQ_ITEMS = [
  {
    q: 'How does the 4-digit handover code protect my order?',
    a: 'Every accepted order gets a cryptographically random 4-digit code unique among active orders at that gate. The vendor writes it on the sealed packet; you match both codes physically before confirming delivery. Up to 5 wrong guesses lock verification until vendor counter assist.',
  },
  {
    q: 'Why is there zero delivery fee?',
    a: 'TreFood only serves NIT Patna campus vendors and hostel gates within short walking range. Hyperlocal counter batching removes third-party rider fleet markups so students pay menu prices.',
  },
  {
    q: 'What are the gate curfews at NIT Patna?',
    a: 'Boys Hostel Gate and Girls Hostel Gate close at 19:30 IST (7:30 PM), while Main Gate / Academic Blocks operates 24x7. TreFood checks current IST time + vendor prep + walk time + 15-minute gate buffer before accepting orders.',
  },
  {
    q: 'What happens if I try ordering right before curfew?',
    a: 'If your packet cannot arrive 15 minutes before the hostel gate closes, checkout refuses that gate cleanly with the exact latest safe order time and suggests an alternate open gate such as Main Gate / Academic Blocks.',
  },
  {
    q: 'What is Campus Night Safety after 7:00 PM?',
    a: 'From 19:00 IST (7:00 PM) onward, all orders are delivered personally by the shop owner, co-owner, or verified senior staff—never unknown external couriers.',
  },
  {
    q: 'Do guests have to sign in just to browse menus or test gates?',
    a: 'No. Guests can switch gates, search shops and dishes, test curfew rules, and add items to a cart freely. Sign-in with an @nitp.ac.in email (or 1-tap demo login) is only prompted when placing an order.',
  },
  {
    q: 'How and when do I pay?',
    a: 'Pay at the gate via Cash or UPI after inspecting your packet and verifying your 4-digit handover code.',
  },
  {
    q: 'Can I order raw chicken, fruits, and groceries on TreFood?',
    a: 'Yes! Campus fruit stalls, hostel kirana groceries, fresh vegetable vendors, and hygienic sealed poultry counters are all searchable from Browse Menus.',
  },
  {
    q: 'What happens if hostel Wi-Fi drops while ordering?',
    a: 'The initial page loads under 150 KB gzip JS, carts persist offline locally, order trackers use lightweight ETag 304 polling, and POST /api/orders enforces Idempotency-Key deduplication so retries never double-order.',
  },
  {
    q: 'What if something is missing or spilled in my packet?',
    a: 'If you spot an issue at the gate, verify before paying. If noticed afterward, file a quick report on your order screen (/orders) for campus admin review, replacement, or settlement credit.',
  },
  {
    q: 'How can a campus vendor join TreFood?',
    a: 'Fill out the 3-field vendor onboarding form in the For Vendors section on this page (saved straight to D1) or message the campus coordinator via the WhatsApp link in the footer.',
  },
] as const;

interface SearchSuggestResult {
  vendors: Array<{ id: string; slug: string; name: string; category: string; isOpen: boolean }>;
  items: Array<{ id: string; vendorId: string; name: string; pricePaise: number; inStock: boolean }>;
}

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

export function LandingPage() {
  const navigate = useNavigate();
  const { selectedGateId, setSelectedGateId } = useCart();

  // Live campus gates & stats fetched cleanly for guests
  const { data: campusData, isLoading: campusLoading } = useQuery<CampusSummaryResponse>({
    queryKey: ['campus', 'nitp'],
    queryFn: async () => {
      const res = await fetch('/api/campuses/nitp');
      if (!res.ok) throw new Error('Failed to load campus info');
      return res.json();
    },
    staleTime: 30000,
  });

  const gates: Gate[] = campusData?.gates || [];
  const selectedGate =
    gates.find((g) => g.id === selectedGateId) || gates[0] || null;
  const gateStatus = selectedGate ? getGateCurfewStatus(selectedGate) : null;
  const nightSafetyNow = isNightSafetyActive();

  // Guest hero search box + debounced suggestions
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText.trim()), 200);
    return () => clearTimeout(t);
  }, [searchText]);

  const { data: suggestData } = useQuery<{ ok: boolean } & SearchSuggestResult>({
    queryKey: ['search-suggest', debouncedSearch],
    queryFn: async () => {
      const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(debouncedSearch)}`);
      return res.json();
    },
    enabled: debouncedSearch.length >= 2,
    staleTime: 15000,
  });

  // Animated live hero order card (respecting prefers-reduced-motion)
  const [demoStatusIdx, setDemoStatusIdx] = useState(3);
  const [activeHowStep, setActiveHowStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const timer = setInterval(() => {
      setDemoStatusIdx((prev) => (prev + 1) % STATUS_SEQUENCE.length);
    }, 3600);
    return () => clearInterval(timer);
  }, []);

  const currentDemoStatus = STATUS_SEQUENCE[demoStatusIdx];

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchText.trim()) params.set('q', searchText.trim());
    if (selectedGate) params.set('gate', selectedGate.id);
    navigate(`/browse${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const suggestDropdownVisible = useMemo(() => {
    if (!searchFocused || debouncedSearch.length < 2 || !suggestData) return false;
    return (suggestData.vendors?.length || 0) > 0 || (suggestData.items?.length || 0) > 0;
  }, [searchFocused, debouncedSearch, suggestData]);

  return (
    <div className="space-y-16 sm:space-y-20 pb-8">
      <SeoHead
        title="TreFood | NIT Patna Food, Fruits, Groceries & Raw Chicken to Your Gate"
        description="Order hot meals, fruits, groceries, and raw chicken at NIT Patna with zero delivery fee, curfew-aware gate routing, and 4-digit handover code verification."
        path="/"
        jsonLd={LANDING_JSON_LD}
      />

      {/* 1. HERO SECTION */}
      <section className="relative pt-6 sm:pt-10">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Hero Left: Headline + Guest Gate Picker + Guest Search Box */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-amber-300 bg-[#FEF3C7] px-3 py-1 text-xs font-bold text-[#78350F] dark:border-[#6B4510] dark:bg-[#331F04] dark:text-[#FDE68A]">
                <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>NIT Patna • ₹0 Delivery Fee • Pay at Gate</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[var(--color-text)] leading-[1.12]">
                Hungry after lab, cooking dinner, or restocking chai?{' '}
                <span className="text-[#830020] dark:text-[#FFB400]">
                  Delivered to your NIT Patna gate.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-[var(--color-text-muted)] max-w-2xl leading-relaxed">
                Order canteen meals, fresh fruit, daily groceries, and hygienic raw chicken without
                signing in first. Verify the 4-digit code on your packet at the gate and pay with
                zero delivery fee.
              </p>

              {/* Guest Gate Picker + Search Box Card */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Guest Gate Picker */}
                  <div className="sm:col-span-5">
                    <label
                      htmlFor="hero-gate-select"
                      className="mb-1 flex items-center justify-between text-xs font-bold text-[var(--color-text)]"
                    >
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
                        Your Gate
                      </span>
                      {gateStatus && (
                        <span className="text-[11px] font-semibold text-[#830020] dark:text-[#FFB400]">
                          {gateStatus.label}
                        </span>
                      )}
                    </label>
                    <select
                      id="hero-gate-select"
                      value={selectedGate?.id || 'gate_main'}
                      onChange={(e) => setSelectedGateId(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 text-sm font-semibold text-[var(--color-text)] focus:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
                    >
                      {gates.length > 0 ? (
                        gates.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="gate_main">Main Gate / Academic Blocks</option>
                          <option value="gate_h5">Boys Hostel Gate</option>
                          <option value="gate_h7">Girls Hostel Gate</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Guest Search Input */}
                  <form onSubmit={handleHeroSearchSubmit} className="sm:col-span-7 relative">
                    <label
                      htmlFor="hero-search-input"
                      className="mb-1 block text-xs font-bold text-[var(--color-text)]"
                    >
                      Search dishes, fruit, groceries or canteens
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]"
                          aria-hidden="true"
                        />
                        <input
                          id="hero-search-input"
                          type="search"
                          value={searchText}
                          onFocus={() => setSearchFocused(true)}
                          onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                          onChange={(e) => setSearchText(e.target.value)}
                          placeholder="Try biryani, chicken, banana, chai..."
                          className="w-full min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] pl-9 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
                        />
                      </div>
                      <Button type="submit" className="shrink-0 px-4">
                        Search
                      </Button>
                    </div>

                    {/* Autocomplete dropdown for guests */}
                    {suggestDropdownVisible && (
                      <div
                        role="listbox"
                        aria-label="Search suggestions"
                        className="absolute left-0 right-0 z-30 mt-1.5 max-h-64 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-xl space-y-1"
                      >
                        {suggestData?.vendors?.map((v) => (
                          <Link
                            key={v.id}
                            to={`/vendor/${v.slug}`}
                            className="flex min-h-[44px] items-center justify-between rounded-xl px-3 py-1.5 text-sm hover:bg-[var(--color-surface-sunken)]"
                          >
                            <span className="font-bold text-[var(--color-text)]">{v.name}</span>
                            <span className="text-xs font-semibold text-[#830020] dark:text-[#FFB400]">
                              Shop • {v.isOpen ? 'Open' : 'Closed'}
                            </span>
                          </Link>
                        ))}
                        {suggestData?.items?.map((item) => (
                          <Link
                            key={item.id}
                            to={`/vendor/${item.vendorId}`}
                            className="flex min-h-[44px] items-center justify-between rounded-xl px-3 py-1.5 text-sm hover:bg-[var(--color-surface-sunken)]"
                          >
                            <span className="text-[var(--color-text)]">{item.name}</span>
                            <span className="font-mono text-xs font-bold text-[var(--color-text-muted)]">
                              ₹{(item.pricePaise / 100).toFixed(0)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </form>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <Button
                    onClick={() =>
                      navigate(`/browse${selectedGate ? `?gate=${selectedGate.id}` : ''}`)
                    }
                    variant="primary"
                    className="min-h-[48px] px-6 text-base"
                  >
                    <ShoppingBag className="mr-2 h-5 w-5" aria-hidden="true" />
                    <span>Browse Campus Canteens</span>
                  </Button>
                  <a
                    href="#how-it-works"
                    className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-5 text-sm font-bold text-[var(--color-text)] hover:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
                  >
                    See 4-step gate handover
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[var(--color-text-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  Pay at gate (Cash / UPI)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#92400E] dark:text-[#FFB400]" aria-hidden="true" />
                  19:30 Hostel curfew aware
                </span>
                {nightSafetyNow && (
                  <span className="inline-flex items-center gap-1.5 font-bold text-[#830020] dark:text-[#FFB400]">
                    <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                    Night Safety Mode active now
                  </span>
                )}
              </div>
            </div>

            {/* Hero Right: Animated Live Order Card with 4-digit code, itemised bill & status */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-sm space-y-3 min-h-[460px]">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  <span>Live Packet Card (Demo)</span>
                  <span className="text-[#830020] dark:text-[#FFB400]">{currentDemoStatus.label}</span>
                </div>

                <HandoverTicket
                  orderNo="TF-2048"
                  handoverCode="7842"
                  vendorName="Ganga Hostel Canteen"
                  gateName={selectedGate?.name || 'Boys Hostel Gate'}
                  status={currentDemoStatus.key}
                  eta="14 mins"
                  totalPaise={16000}
                  showVibrate={false}
                />

                {/* Itemised Bill Breakdown */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs space-y-2 text-xs">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Itemised Packet Bill • {currentDemoStatus.detail}
                  </h2>
                  <div className="space-y-1 text-[var(--color-text)]">
                    <div className="flex justify-between">
                      <span>2x Paneer Bhurji Roll</span>
                      <span className="font-mono font-semibold">₹140</span>
                    </div>
                    <div className="flex justify-between">
                      <span>1x Adrak Masala Chai</span>
                      <span className="font-mono font-semibold">₹20</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                      <span>Campus Delivery Fee</span>
                      <span className="font-mono">₹0</span>
                    </div>
                    <div className="flex justify-between border-t border-[var(--color-border)] pt-1.5 text-sm font-extrabold">
                      <span>Pay at Gate</span>
                      <span className="font-mono">₹160</span>
                    </div>
                  </div>
                </div>

                {/* Accessible 44px status preview buttons */}
                <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Preview order status">
                  {STATUS_SEQUENCE.map((s, idx) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setDemoStatusIdx(idx)}
                      className={`min-h-[44px] rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-[#FFB400] ${
                        demoStatusIdx === idx
                          ? 'bg-[#830020] text-white'
                          : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LIVE STAT STRIP FED FROM API (Explicit Demo Data Label) */}
      <section aria-labelledby="stats-heading" className="mx-auto max-w-6xl px-4">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="stats-heading" className="font-display text-lg font-extrabold text-[var(--color-text)]">
              Live Campus Stats
            </h2>
            <span className="rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-bold text-[#78350F] dark:bg-[#331F04] dark:text-[#FDE68A]">
              Live API • Demo Campus Data
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 min-h-[84px]">
            <div className="rounded-2xl bg-[var(--color-surface-sunken)] p-4">
              <div className="text-xs font-semibold text-[var(--color-text-muted)]">Vendors Open Now</div>
              <div className="mt-1 font-mono text-2xl font-black text-[#830020] dark:text-[#FFB400]">
                {campusLoading
                  ? '—'
                  : `${campusData?.stats?.openVendorsCount ?? 10} / ${campusData?.stats?.totalVendors ?? 12}`}
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--color-surface-sunken)] p-4">
              <div className="text-xs font-semibold text-[var(--color-text-muted)]">Average Gate ETA</div>
              <div className="mt-1 font-mono text-2xl font-black text-[var(--color-text)]">
                {campusLoading ? '—' : `~${campusData?.stats?.avgEtaMinutes ?? 22} min`}
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--color-surface-sunken)] p-4">
              <div className="text-xs font-semibold text-[var(--color-text-muted)]">Orders Handed Over</div>
              <div className="mt-1 font-mono text-2xl font-black text-[var(--color-text)]">
                {campusLoading ? '—' : `${campusData?.stats?.ordersHandedOver ?? 20}+`}
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--color-surface-sunken)] p-4">
              <div className="text-xs font-semibold text-[var(--color-text-muted)]">Gate Delivery Fee</div>
              <div className="mt-1 font-mono text-2xl font-black text-emerald-700 dark:text-emerald-400">
                ₹0 Always
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CATEGORY TILES LINKING TO REAL PAGES */}
      <section aria-labelledby="categories-heading" className="mx-auto max-w-6xl px-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 id="categories-heading" className="font-display text-2xl font-extrabold text-[var(--color-text)]">
              Explore Campus Categories
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Tap any category to filter open NIT Patna counters immediately.
            </p>
          </div>
          <Link
            to="/browse"
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-3 text-sm font-bold text-[#830020] hover:underline dark:text-[#FFB400]"
          >
            <span>All 12 Vendors</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {CAMPUS_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/browse?category=${cat.id}`}
              className="flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center transition-colors hover:border-[#830020] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              <img src={cat.img} alt="" width={48} height={48} className="h-12 w-12" />
              <span className="text-xs font-bold text-[var(--color-text)] leading-tight">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. INTERACTIVE 4-STEP HOW IT WORKS */}
      <section id="how-it-works" aria-labelledby="how-heading" className="mx-auto max-w-6xl px-4 scroll-mt-20 space-y-6">
        <div className="max-w-2xl space-y-1.5">
          <h2 id="how-heading" className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
            How TreFood Works at NIT Patna
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Select each step below to see how hostel gate delivery replaces rider guesswork.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {HOW_IT_WORKS_STEPS.map((item, idx) => {
              const isSelected = activeHowStep === idx;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => setActiveHowStep(idx)}
                  aria-pressed={isSelected}
                  className={`flex flex-col text-left rounded-2xl border p-5 transition-all focus:outline-none focus:ring-2 focus:ring-[#FFB400] ${
                    isSelected
                      ? 'border-[#830020] bg-[var(--color-surface)] shadow-md ring-1 ring-[#830020]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[#830020]/60'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-mono text-xl font-black text-[#830020] dark:text-[#FFB400]">
                      {item.step}
                    </span>
                    <span className="rounded-full bg-[var(--color-surface-sunken)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-text-muted)]">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-extrabold text-[var(--color-text)]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Interactive animated step spotlight */}
          <div className="lg:col-span-5 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col justify-between space-y-5 shadow-xs">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#830020] px-3 py-1 text-xs font-bold text-[#FFB400]">
                Step {HOW_IT_WORKS_STEPS[activeHowStep].step} Spotlight
              </div>
              <h3 className="font-display text-xl font-extrabold text-[var(--color-text)]">
                {HOW_IT_WORKS_STEPS[activeHowStep].title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
                {HOW_IT_WORKS_STEPS[activeHowStep].desc}
              </p>
            </div>

            <div className="space-y-2 rounded-2xl bg-[var(--color-surface-sunken)] p-4">
              <div className="flex justify-between text-xs font-bold text-[var(--color-text)]">
                <span>Step Progress</span>
                <span className="font-mono">{activeHowStep + 1} / 4</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full bg-[#830020] dark:bg-[#FFB400] transition-all duration-300"
                  style={{ width: `${((activeHowStep + 1) / 4) * 100}%` }}
                />
              </div>
              <div className="pt-2">
                <Link
                  to="/browse"
                  className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-[#830020] hover:underline dark:text-[#FFB400]"
                >
                  <span>Try this live in Browse Menus</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHY IT IS BUILT FOR CAMPUS + INTERACTIVE CURFEW MINI-DEMO */}
      <section id="safety" aria-labelledby="campus-built-heading" className="mx-auto max-w-6xl px-4 scroll-mt-20 space-y-6">
        <div className="max-w-2xl space-y-1.5">
          <h2 id="campus-built-heading" className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
            Why It’s Built Specifically for NIT Patna
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Every design constraint comes directly from hostel Wi-Fi, gate curfews, and evening campus safety.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#830020] text-[#FFB400]">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-[var(--color-text)]">4-Digit Handover Code</h3>
            <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
              Unique random code per active gate packet prevents wrong handoffs and enforces a 5-attempt lockout guard.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#830020] text-[#FFB400]">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-[var(--color-text)]">Curfew-Aware Routing</h3>
            <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
              Hostel gates close at 19:30 IST with a 15-minute window while Main Gate / Academic Blocks runs 24x7.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#830020] text-[#FFB400]">
              <Wifi className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-[var(--color-text)]">Built for Hostel Wi-Fi</h3>
            <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
              Under 150 KB gzip JavaScript first load, ETag 304 polling, no bloated maps, and offline-safe local cart storage.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#830020] text-[#FFB400]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-[var(--color-text)]">Campus Night Safety</h3>
            <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
              After 7:00 PM IST, packet drop-offs are handled personally by the shop owner, co-owner, or senior staff.
            </p>
          </div>
        </div>

        {/* Interactive Curfew Logic Mini-Demo */}
        <CurfewMiniDemo gates={gates} />
      </section>

      {/* 6. FOR VENDORS: EARNINGS CALCULATOR + D1 ONBOARDING FORM */}
      <VendorOnboardingSection />

      {/* 7. TRUST SECTION (NIGHT SAFETY POLICY & REFUND SUMMARY) */}
      <section aria-labelledby="trust-heading" className="mx-auto max-w-6xl px-4 space-y-5">
        <h2 id="trust-heading" className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
          Campus Trust, Night Safety & Refund Standards
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#830020] dark:text-[#FFB400]">
              <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
              <h3>Night Safety Policy (7 PM+)</h3>
            </div>
            <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
              From 19:00 IST onward, vendors displaying the Night Safe badge handle hostel gate
              deliveries strictly through the owner, co-owner, or senior staff for accountability.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#830020] dark:text-[#FFB400]">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <h3>Pay-at-Gate & Refund Summary</h3>
            </div>
            <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
              Inspect your sealed packet and 4-digit code before paying. Missing or damaged items
              can be disputed directly in /orders with admin replacement or credit resolution.
            </p>
            <Link
              to="/refunds"
              className="inline-flex min-h-[44px] items-center text-xs font-bold text-[#830020] hover:underline dark:text-[#FFB400]"
            >
              Read draft refund policy
            </Link>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#830020] dark:text-[#FFB400]">
              <Store className="h-5 w-5 shrink-0" aria-hidden="true" />
              <h3>Verified Campus Kitchens</h3>
            </div>
            <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
              Every vendor lists FSSAI registration details, counter phone, and real kitchen prep
              estimates audited by campus administrators.
            </p>
          </div>
        </div>
      </section>

      {/* 8. SAMPLE TESTIMONIALS (EXPLICITLY LABELLED AS SAMPLE) */}
      <section aria-labelledby="testimonials-heading" className="mx-auto max-w-6xl px-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="testimonials-heading" className="font-display text-2xl font-extrabold text-[var(--color-text)]">
            Student Feedback
          </h2>
          <span className="rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-1 text-xs font-bold text-[var(--color-text-muted)]">
            Sample Testimonials (Demo Data)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SAMPLE_TESTIMONIALS.map((item) => (
            <blockquote
              key={item.author}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div role="img" className="flex items-center gap-1 text-[#FFB400]" aria-label="5 out of 5 sample rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className="h-4 w-4 fill-current" aria-hidden="true" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-[var(--color-text)]">
                  “{item.quote}”
                </p>
              </div>
              <footer className="text-xs">
                <div className="font-bold text-[var(--color-text)]">{item.author}</div>
                <div className="text-[var(--color-text-muted)]">{item.meta}</div>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* 9. FAQ ACCORDION (11 REAL QUESTIONS) */}
      <section id="faq" aria-labelledby="faq-heading" className="mx-auto max-w-3xl px-4 scroll-mt-20 space-y-5">
        <div className="text-center space-y-1.5">
          <h2 id="faq-heading" className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
            Practical answers about hostel gate deliveries, curfews, codes, and campus safety.
          </p>
        </div>

        <div className="divide-y divide-[var(--color-border)] rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 sm:px-6">
          {FAQ_ITEMS.map((item, idx) => {
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

      {/* 10. FINAL CTA */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-10 text-center space-y-4 shadow-xs">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
            Ready to order from NIT Patna kitchens with ₹0 delivery fee?
          </h2>
          <p className="mx-auto max-w-xl text-sm text-[var(--color-text-muted)]">
            Browse all 12 sample campus menus freely right now. Sign in only when you are ready to
            send your packet to the hostel gate.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <Button onClick={() => navigate('/browse')} className="min-h-[48px] px-7">
              Browse Open Campus Menus
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/dev/ui')}
              className="min-h-[48px] px-5"
            >
              View Design Kit (/dev/ui)
            </Button>
          </div>
        </div>
      </section>

      {/* 11. FOOTER WITH TERMS, PRIVACY, REFUNDS, CONTACT (WHATSAPP), ABOUT */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] pt-10 pb-12">
        <div className="mx-auto max-w-6xl px-4 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#830020] text-[#FFB400] font-bold">
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="font-display text-lg font-extrabold tracking-tight text-[#830020] dark:text-[#FFB400]">
                  TreFood
                </span>
                <span className="rounded bg-[#FEF3C7] px-2 py-0.5 text-xs font-bold text-[#78350F] dark:bg-[#331F04] dark:text-[#FDE68A]">
                  NIT Patna
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Hyperlocal campus delivery • Zero delivery fee • 4-digit gate handover verification
              </p>
            </div>

            <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-[var(--color-text)]">
              <Link to="/about" className="inline-flex min-h-[44px] items-center hover:text-[#830020] dark:hover:text-[#FFB400]">
                About
              </Link>
              <Link to="/terms" className="inline-flex min-h-[44px] items-center hover:text-[#830020] dark:hover:text-[#FFB400]">
                Terms
              </Link>
              <Link to="/privacy" className="inline-flex min-h-[44px] items-center hover:text-[#830020] dark:hover:text-[#FFB400]">
                Privacy
              </Link>
              <Link to="/refunds" className="inline-flex min-h-[44px] items-center hover:text-[#830020] dark:hover:text-[#FFB400]">
                Refunds
              </Link>
              <a
                href="https://wa.me/919999999999?text=Hi%20TreFood%20NIT%20Patna%20team"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 hover:text-[#830020] dark:hover:text-[#FFB400]"
              >
                <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>Contact (WhatsApp)</span>
              </a>
              <Link to="/v" className="inline-flex min-h-[44px] items-center text-[var(--color-text-muted)] hover:underline">
                Vendor Console
              </Link>
              <Link to="/admin" className="inline-flex min-h-[44px] items-center text-[var(--color-text-muted)] hover:underline">
                Admin
              </Link>
            </nav>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-text-muted)]">
            <span>© 2026 TreFood Prototype (NIT Patna). All menus, stats and testimonials shown are sample data.</span>
            <span>Support email: support@trefood.in</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
