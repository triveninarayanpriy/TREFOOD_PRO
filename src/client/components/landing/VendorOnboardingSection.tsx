import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { VENDOR_SHOP_TYPES } from '@shared/schemas';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Store, CheckCircle2, ArrowRight } from 'lucide-react';

type ShopTypeKey = (typeof VENDOR_SHOP_TYPES)[number];

const SHOP_TYPE_LABELS: Record<ShopTypeKey, string> = {
  meals: 'Meals & Biryani Counters',
  snacks: 'Chai, Snacks & Fast Food',
  fruits: 'Fresh Fruits & Juices',
  groceries: 'Hostel Kirana & Groceries',
  vegetables: 'Fresh Vegetables',
  raw_chicken: 'Fresh / Raw Chicken',
  late_night: 'Late Night Counter (after 10 PM)',
  beverages: 'Shakes, Lassi & Beverages',
};

export function VendorOnboardingSection() {
  const [vendorName, setVendorName] = useState('');
  const [shopType, setShopType] = useState<ShopTypeKey>('snacks');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<{
    id: string;
    vendorName: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/vendor-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName: vendorName.trim(),
          shopType,
          phone: phone.trim(),
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        application?: { id: string; vendorName: string };
        error?: { message?: string };
      };

      if (!res.ok || !data.application) {
        setFormError(data.error?.message || 'Check your shop name and 10-digit WhatsApp number.');
        return;
      }

      setSubmittedRef({
        id: data.application.id,
        vendorName: data.application.vendorName,
      });
      setVendorName('');
      setPhone('');
    } catch {
      setFormError('Network error while saving your request. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="for-vendors"
      aria-labelledby="vendor-onboarding-heading"
      className="mx-auto max-w-6xl px-4 scroll-mt-20"
    >
      <div className="rounded-2xl border border-[#830020]/30 bg-[#1C1210] text-[#FBF6EE] p-6 sm:p-10 shadow-[var(--shadow-card)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Straightforward campus vendor counter pitch */}
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#FFB400]">
              <Store className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>For Campus Vendors</span>
            </div>

            <h2
              id="vendor-onboarding-heading"
              className="font-display text-2xl sm:text-3xl font-extrabold leading-tight text-[#FBF6EE]"
            >
              Put your NIT Patna counter online with zero commission markup.
            </h2>

            <p className="text-sm leading-relaxed text-[#E5DAD2]">
              Accept hostel gate orders straight on a tablet, print the 4-digit packet chit onto the
              bag, and hand over batches directly at Main Gate or Boys and Girls Hostel Gates before
              curfew.
            </p>

            <ul className="space-y-2 text-xs sm:text-sm text-[#E5DAD2] border-t border-white/15 pt-4">
              <li>• One-tap item stock toggles when evening chai or biryani runs out.</li>
              <li>• 56px order board for busy kitchens with New, Preparing, Ready, and Handed over.</li>
              <li>• Pay-at-gate Cash or UPI settled directly at your counter daily.</li>
            </ul>

            <Link
              to="/v"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#FFB400]/50 bg-white/10 px-4 text-sm font-bold text-[#FBF6EE] hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              <span>Open Vendor Console (/v)</span>
              <ArrowRight className="h-4 w-4 text-[#FFB400]" aria-hidden="true" />
            </Link>
          </div>

          {/* Right: Crisp 3-field Onboarding Form saved to D1 */}
          <div className="lg:col-span-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-[var(--color-text)] shadow-sm">
            <h3 className="font-display text-lg font-extrabold text-[var(--color-text)]">
              Register a campus stall or kitchen
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Share your counter name and WhatsApp number. Campus coordinators set up your menu
              catalogue in one visit.
            </p>

            {submittedRef ? (
              <div
                role="status"
                aria-live="polite"
                className="mt-5 rounded-xl border border-[#15803D]/35 bg-[#ECFDF3] p-5 text-[#14532D] dark:border-[#15803D]/50 dark:bg-[#052E16] dark:text-[#DCFCE7] space-y-2.5"
              >
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>Application saved to D1!</span>
                </div>
                <p className="text-xs leading-relaxed">
                  <strong>{submittedRef.vendorName}</strong> is queued for campus onboarding check.
                  Reference: <span className="font-mono font-bold">{submittedRef.id}</span>
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setSubmittedRef(null)}
                >
                  Submit another shop
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <Input
                  id="onboard-vendor-name"
                  label="Shop / Canteen Name"
                  placeholder="e.g. Ashok Rajpath Chai Stall"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  required
                />

                <div>
                  <label
                    htmlFor="onboard-shop-type"
                    className="mb-1 block text-xs font-semibold text-[var(--color-text)]"
                  >
                    Shop Category
                  </label>
                  <select
                    id="onboard-shop-type"
                    value={shopType}
                    onChange={(e) => setShopType(e.target.value as ShopTypeKey)}
                    className="w-full min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 text-sm text-[var(--color-text)] focus:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
                  >
                    {VENDOR_SHOP_TYPES.map((typeKey) => (
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
                  hint="10-digit Indian mobile number"
                  required
                />

                {formError && (
                  <p role="alert" className="text-xs font-semibold text-[#B91C1C] dark:text-[#FCA5A5]">
                    {formError}
                  </p>
                )}

                <Button type="submit" className="w-full" variant="amber" loading={submitting}>
                  Submit onboarding request
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
