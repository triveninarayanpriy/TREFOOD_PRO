import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Calculator, Store, CheckCircle2, ArrowRight } from 'lucide-react';

const SHOP_TYPE_LIST = [
  'meals',
  'snacks',
  'fruits',
  'groceries',
  'vegetables',
  'raw_chicken',
  'late_night',
  'beverages',
] as const;

type ShopTypeKey = (typeof SHOP_TYPE_LIST)[number];

const SHOP_TYPE_LABELS: Record<ShopTypeKey, string> = {
  meals: 'Canteen Meals & Tiffin',
  snacks: 'Snacks, Chai & Bakery',
  fruits: 'Fresh Fruits & Juices',
  groceries: 'Hostel Daily Groceries',
  vegetables: 'Fresh Vegetables',
  raw_chicken: 'Raw Chicken & Eggs',
  late_night: 'Late Night Counter',
  beverages: 'Beverages & Cold Coffee',
};

export function VendorOnboardingSection() {
  // Earnings calculator state
  const [dailyOrders, setDailyOrders] = useState(45);
  const [avgTicketInr, setAvgTicketInr] = useState(140);

  // Onboarding form state
  const [vendorName, setVendorName] = useState('');
  const [shopType, setShopType] = useState<ShopTypeKey>('meals');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<{ id: string; vendorName: string } | null>(null);

  const weeklyRevenue = dailyOrders * avgTicketInr * 7;
  const monthlyRevenue = dailyOrders * avgTicketInr * 30;
  // Illustrative ~18% aggregator commission savings in campus model
  const estimatedCommissionSaved = Math.round(monthlyRevenue * 0.18);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = vendorName.trim();
    const cleanPhone = phone.trim().replace(/[\s-]/g, '').replace(/^\+91/, '');
    if (cleanName.length < 2 || cleanName.length > 80) {
      setFormError('Enter your shop or canteen name (2–80 characters).');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setFormError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/vendor-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName: cleanName,
          shopType,
          phone: cleanPhone,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        application?: { id: string; vendorName: string };
        error?: { message?: string };
      };
      if (!res.ok || !data.ok || !data.application) {
        setFormError(data.error?.message || 'Unable to submit onboarding application right now.');
        return;
      }
      setSubmittedRef(data.application);
      setVendorName('');
      setPhone('');
    } catch {
      setFormError('Network error saving application to Cloudflare D1. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="for-vendors" className="mx-auto max-w-6xl px-4 scroll-mt-20">
      <div className="rounded-3xl bg-[#830020] p-6 sm:p-8 lg:p-10 text-white shadow-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Pitch + Interactive Earnings Calculator */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFB400]/20 px-3 py-1 text-xs font-bold text-[#FDE68A]">
                <Store className="h-3.5 w-3.5" aria-hidden="true" />
                For NIT Patna Canteens & Vendors
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                Take gate orders on a single counter tablet
              </h2>
              <p className="text-sm text-amber-100/90 leading-relaxed">
                Keep 100% of your counter menu price with zero rider commission. Manage rush-hour
                prep times, print 4-digit packet tickets, and track daily pay-at-gate settlements.
              </p>
            </div>

            {/* Earnings Calculator */}
            <div className="rounded-2xl border border-white/15 bg-black/25 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#FFB400]">
                  <Calculator className="h-4 w-4" aria-hidden="true" />
                  <span>Vendor Earnings Calculator</span>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-100">
                  Illustrative Estimate
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <label htmlFor="calc-daily-orders">Campus orders per day</label>
                    <span className="font-mono font-bold text-[#FFB400]">{dailyOrders} orders</span>
                  </div>
                  <input
                    id="calc-daily-orders"
                    type="range"
                    min={10}
                    max={150}
                    step={5}
                    value={dailyOrders}
                    onChange={(e) => setDailyOrders(Number(e.target.value))}
                    className="w-full accent-[#FFB400] min-h-[28px] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <label htmlFor="calc-avg-ticket">Average order value (INR)</label>
                    <span className="font-mono font-bold text-[#FFB400]">₹{avgTicketInr}</span>
                  </div>
                  <input
                    id="calc-avg-ticket"
                    type="range"
                    min={60}
                    max={400}
                    step={10}
                    value={avgTicketInr}
                    onChange={(e) => setAvgTicketInr(Number(e.target.value))}
                    className="w-full accent-[#FFB400] min-h-[28px] cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/15 text-center sm:text-left">
                <div>
                  <div className="text-[11px] text-amber-100/80">Weekly Sales</div>
                  <div className="font-mono text-base sm:text-lg font-extrabold text-white">
                    ₹{weeklyRevenue.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-amber-100/80">Monthly Sales</div>
                  <div className="font-mono text-base sm:text-lg font-extrabold text-[#FFB400]">
                    ₹{monthlyRevenue.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-amber-100/80">Fee Saved (~18%)</div>
                  <div className="font-mono text-base sm:text-lg font-extrabold text-emerald-300">
                    ₹{estimatedCommissionSaved.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            <Link
              to="/v"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-300/40 bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              <span>Preview Vendor Counter Console (/v)</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {/* Right: Onboarding Form stored directly in D1 */}
          <div className="lg:col-span-6 rounded-2xl bg-[var(--color-surface)] p-6 text-[var(--color-text)] shadow-xl">
            <h3 className="text-lg font-extrabold text-[var(--color-text)]">
              Apply for Campus Vendor Onboarding
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Submit your stall or canteen details. Our NIT Patna coordinator verifies FSSAI and
              opens your counter dashboard.
            </p>

            {submittedRef ? (
              <div
                role="status"
                aria-live="polite"
                className="mt-5 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100 space-y-2"
              >
                <div className="flex items-center gap-2 font-extrabold">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                  <span>Application saved to D1!</span>
                </div>
                <p className="text-xs leading-relaxed">
                  <strong>{submittedRef.vendorName}</strong> has been queued for campus verification.
                  Reference ID: <span className="font-mono font-bold">{submittedRef.id}</span>
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setSubmittedRef(null)}
                >
                  Submit Another Shop
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <Input
                  id="onboard-vendor-name"
                  label="Shop / Canteen Name"
                  placeholder="e.g. Maurya Chai & Maggi Corner"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  required
                />

                <div>
                  <label
                    htmlFor="onboard-shop-type"
                    className="mb-1.5 block text-sm font-medium text-[var(--color-text)]"
                  >
                    Shop Category
                  </label>
                  <select
                    id="onboard-shop-type"
                    value={shopType}
                    onChange={(e) => setShopType(e.target.value as ShopTypeKey)}
                    className="w-full min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] focus:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
                  >
                    {SHOP_TYPE_LIST.map((typeKey) => (
                      <option key={typeKey} value={typeKey}>
                        {SHOP_TYPE_LABELS[typeKey]}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  id="onboard-vendor-phone"
                  label="Owner WhatsApp / Mobile Number"
                  type="tel"
                  inputMode="numeric"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  hint="10-digit Indian mobile number (saved in D1 prototype database)"
                  required
                />

                {formError && (
                  <p role="alert" className="text-xs font-semibold text-red-700 dark:text-red-400">
                    {formError}
                  </p>
                )}

                <Button type="submit" className="w-full" variant="amber" loading={submitting}>
                  Submit Onboarding Request
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
