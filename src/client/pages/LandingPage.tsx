import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { HandoverTicket } from '../components/ui/HandoverTicket';
import {
  MealsIllustration,
  FruitsIllustration,
  GroceriesIllustration,
  VegetablesIllustration,
  RawChickenIllustration,
} from '../components/illustrations';
import {
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronDown,
  ShoppingBag,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'How does the 4-digit handover code work?',
    a: 'When your order arrives at the hostel gate, the delivery partner matches the 4-digit code written on your food packet with the code shown on your phone screen. Only you can confirm delivery after verifying the digits.',
  },
  {
    q: 'Why is there zero delivery fee?',
    a: 'TreFood is designed exclusively for NIT Patna campus. Hyperlocal batching directly between on-campus vendors and hostel gates allows us to keep delivery completely free for all students.',
  },
  {
    q: 'How do curfews affect my order?',
    a: 'Hostel gates have designated curfew times (e.g., Hostel 5 Gate at 22:30, Main Gate at 23:30). Our system calculates vendor prep time plus walking time to ensure orders reach the gate safely before curfew. If an order cannot make curfew, we explain why and suggest an alternative gate.',
  },
  {
    q: 'When do I have to pay?',
    a: 'You pay at the gate when you collect your packet! Cash and UPI are accepted upon packet inspection.',
  },
  {
    q: 'Do I need an account to browse menus?',
    a: 'No! You can browse all campus canteens, fruit stalls, grocery stores, and menus without creating an account. Sign-in is only required when you actually place an order.',
  },
  {
    q: 'Can I order raw chicken and vegetables on campus?',
    a: 'Yes. Campus poultry and vegetable vendors are integrated with fresh morning and evening slots, sealed hygienically for hostel cooking or mess pickup.',
  },
  {
    q: 'What if my campus Wi-Fi drops while ordering?',
    a: 'TreFood works seamlessly even on weak connections. Cached menus remain readable offline, and order placement uses idempotency keys to ensure you never get double-charged or create duplicate orders on a network retry.',
  },
  {
    q: 'How can on-campus vendors join TreFood?',
    a: 'Campus canteens and shops can register through our Vendor Console (/v). Contact the TreFood team at support@trefood.in or via WhatsApp for campus onboarding.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();

  // Cycling HandoverTicket hero demo
  const [demoStatusIdx, setDemoStatusIdx] = useState(3); // Start at 'at_gate' for maximum excitement
  const statuses = ['placed', 'accepted', 'out_for_delivery', 'at_gate'] as const;

  useEffect(() => {
    const timer = setInterval(() => {
      setDemoStatusIdx((prev) => (prev + 1) % statuses.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [statuses.length]);

  const currentDemoStatus = statuses[demoStatusIdx];

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>Zero Delivery Fee • Curfew-Aware Campus Delivery</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 leading-tight">
                NIT Patna food & essentials,{' '}
                <span className="text-[#830020] dark:text-amber-400">delivered to your gate.</span>
              </h1>

              <p className="text-base text-stone-600 dark:text-stone-300 max-w-xl">
                Order meals, snacks, fruits, groceries and raw chicken from campus vendors. Collect at
                your hostel gate by matching a 4-digit code on the packet.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <Button
                  onClick={() => navigate('/browse')}
                  variant="primary"
                  className="w-full sm:w-auto min-h-[48px] px-6 text-base"
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  <span>Browse Campus Canteens</span>
                </Button>
                <Button
                  onClick={() => navigate('/dev/kit')}
                  variant="secondary"
                  className="w-full sm:w-auto min-h-[48px] px-5 text-sm"
                >
                  <span>Explore UI Kit</span>
                </Button>
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-6 pt-3 text-xs text-stone-500 dark:text-stone-400">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Pay at gate (Cash/UPI)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>Curfew-guaranteed</span>
                </div>
              </div>
            </div>

            {/* Signature Handover Ticket Demo (cycling) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-sm">
                <div className="mb-2 text-center text-xs font-semibold tracking-wide text-stone-500 uppercase">
                  Signature Handover Ticket (Live Demo)
                </div>
                <HandoverTicket
                  orderNo="TF-2026"
                  handoverCode="7842"
                  vendorName="Ganga Canteen"
                  gateName="Hostel 5 Gate"
                  status={currentDemoStatus}
                  eta="12 mins"
                />
                <div className="mt-3 flex justify-center gap-1.5">
                  {statuses.map((s, idx) => (
                    <button
                      key={s}
                      onClick={() => setDemoStatusIdx(idx)}
                      className={`h-1.5 rounded-full transition-all ${
                        demoStatusIdx === idx
                          ? 'w-6 bg-[#830020] dark:bg-amber-400'
                          : 'w-2 bg-stone-300 dark:bg-stone-700'
                      }`}
                      aria-label={`Show ${s} state`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Strip with SVG Spot Illustrations */}
      <section className="mx-auto max-w-5xl px-4">
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Campus Categories</h2>
          <Link
            to="/browse"
            className="text-xs font-semibold text-[#830020] hover:underline dark:text-amber-400 inline-flex items-center gap-1"
          >
            See all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            {
              id: 'meals',
              name: 'Meals & Thali',
              comp: <MealsIllustration size={44} />,
            },
            {
              id: 'snacks',
              name: 'Snacks & Chai',
              comp: <MealsIllustration size={44} />,
            },
            {
              id: 'fruits',
              name: 'Fresh Fruits',
              comp: <FruitsIllustration size={44} />,
            },
            {
              id: 'groceries',
              name: 'Daily Groceries',
              comp: <GroceriesIllustration size={44} />,
            },
            {
              id: 'vegetables',
              name: 'Vegetables',
              comp: <VegetablesIllustration size={44} />,
            },
            {
              id: 'raw_chicken',
              name: 'Raw Chicken',
              comp: <RawChickenIllustration size={44} />,
            },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate(`/browse?category=${cat.id}`)}
              className="flex flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white p-4 text-center transition-all hover:border-[#830020] hover:shadow-md dark:border-stone-800 dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-[#830020]"
            >
              {cat.comp}
              <span className="mt-2 text-xs font-bold text-stone-800 dark:text-stone-200">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 4-Step Process */}
      <section className="mx-auto max-w-5xl px-4">
        <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
          <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            How TreFood Works at NIT Patna
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Engineered for campus life, hostel gates, and quick verified collection.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              step: '01',
              title: 'Pick your gate',
              desc: 'Select Main Gate, Hostel 5, or Hostel 7 gate. We only show open vendors that can reach you before curfew.',
            },
            {
              step: '02',
              title: 'Browse freely',
              desc: 'Explore menus, dishes, groceries and prices with zero login required up-front.',
            },
            {
              step: '03',
              title: 'Sign in & place',
              desc: 'One-tap OTP login with your @nitp.ac.in email at checkout. Zero delivery fees, always.',
            },
            {
              step: '04',
              title: 'Match 4-digit code',
              desc: 'Meet the delivery partner at the gate, match the digits on your packet, pay and enjoy!',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="relative rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="text-2xl font-black font-mono text-[#830020]/20 dark:text-amber-400/20">
                {item.step}
              </div>
              <h3 className="mt-2 text-base font-bold text-stone-900 dark:text-stone-100">
                {item.title}
              </h3>
              <p className="mt-1 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Campus Value Props */}
      <section className="mx-auto max-w-5xl px-4">
        <div className="rounded-3xl border border-stone-200 bg-gradient-to-br from-stone-50 to-amber-50/30 p-8 dark:border-stone-800 dark:from-stone-900 dark:to-amber-950/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#830020] text-amber-400 font-bold">
                ₹0
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Zero Delivery Fee
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                No delivery charge, no surge fees, no hidden packing platform fees. Pay exactly what
                is printed on the vendor counter menu.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#830020] text-amber-400 font-bold">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Curfew Aware
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Hostel curfews (22:30 / 23:00 / 23:30) are factored in server-side with vendor prep
                and walking times. You never get stranded with an undeliverable order.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#830020] text-amber-400 font-bold">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Handover Verification
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Every packet is sealed with a unique 4-digit code. Handover is confirmed by the
                student matching the physical digits, preventing mixed-up deliveries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vendor Section CTA */}
      <section className="mx-auto max-w-5xl px-4">
        <div className="rounded-3xl bg-[#830020] text-white p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-2 text-center md:text-left">
            <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-300">
              Campus Vendors
            </span>
            <h3 className="text-2xl font-bold tracking-tight">Run your canteen on TreFood</h3>
            <p className="text-xs text-amber-100/90 max-w-md">
              Receive orders directly on a counter tablet, manage live stock, set busy times, and
              print 4-digit packet slips in seconds.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => navigate('/v')}
              className="bg-amber-400 text-stone-950 font-bold hover:bg-amber-300"
            >
              Open Vendor Console (/v)
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mx-auto max-w-3xl px-4 space-y-4">
        <div className="text-center space-y-1 mb-6">
          <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Everything you need to know about campus ordering and deliveries at NIT Patna.
          </p>
        </div>

        <div className="divide-y divide-stone-200 border-y border-stone-200 dark:divide-stone-800 dark:border-stone-800">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between text-left text-sm font-semibold text-stone-900 dark:text-stone-100 focus:outline-none"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-2 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white pt-10 pb-16 dark:border-stone-800 dark:bg-stone-950">
        <div className="mx-auto max-w-5xl px-4 space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#830020] text-amber-400 font-bold">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <span className="text-lg font-bold tracking-tight text-[#830020] dark:text-amber-400">
                  TreFood
                </span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  NIT Patna
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                Hyperlocal campus delivery • Zero delivery fee • Curfew aware
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-xs font-medium text-stone-600 dark:text-stone-400">
              <Link to="/browse" className="hover:text-[#830020] dark:hover:text-amber-400">
                Browse Canteens
              </Link>
              <Link to="/v" className="hover:text-[#830020] dark:hover:text-amber-400">
                Vendor Console
              </Link>
              <Link to="/admin" className="hover:text-[#830020] dark:hover:text-amber-400">
                Admin Console
              </Link>
              <Link to="/dev/kit" className="hover:text-[#830020] dark:hover:text-amber-400">
                Design Kit
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-stone-100 pt-6 text-xs text-stone-500 dark:border-stone-900">
            <div>© 2026 TreFood (NIT Patna). All sample data for demonstration.</div>
            <div className="flex gap-4">
              <a
                href="https://wa.me/919999999999"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-[#830020]"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                <span>WhatsApp Support</span>
              </a>
              <Link to="/account" className="hover:underline">
                Privacy & Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
