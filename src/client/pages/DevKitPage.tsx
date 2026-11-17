import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { SeoHead } from '../components/seo/SeoHead';
import { useToast } from '../components/ui/Toast';

// Design System V2 Components
import { MobileVendorCard } from '../components/v2/VendorCard/MobileVendorCard';
import { DesktopVendorCard } from '../components/v2/VendorCard/DesktopVendorCard';
import { MobileMenuItem } from '../components/v2/MenuItem/MobileMenuItem';
import { DesktopMenuItem } from '../components/v2/MenuItem/DesktopMenuItem';
import { MobileCategoryNav } from '../components/v2/CategoryNav/MobileCategoryNav';
import { DesktopCategoryNav } from '../components/v2/CategoryNav/DesktopCategoryNav';
import { MobileCartSummary } from '../components/v2/CartSummary/MobileCartSummary';
import { DesktopCartSummary } from '../components/v2/CartSummary/DesktopCartSummary';
import { MobileGateStatus } from '../components/v2/GateStatus/MobileGateStatus';
import { DesktopGateStatus } from '../components/v2/GateStatus/DesktopGateStatus';
import { MobileOrderStatus } from '../components/v2/OrderStatus/MobileOrderStatus';
import { DesktopOrderStatus } from '../components/v2/OrderStatus/DesktopOrderStatus';
import { SheetV2 } from '../components/v2/Sheet/Sheet';
import { DialogV2 } from '../components/v2/Dialog/Dialog';
import { ToastV2, type ToastType } from '../components/v2/Toast/Toast';
import { EmptyStateV2 } from '../components/v2/EmptyState/EmptyState';
import { MobileCardSkeleton, DesktopCardSkeleton } from '../components/v2/Skeleton/Skeleton';

import {
  Smartphone,
  Monitor,
  UtensilsCrossed,
  Layers,
  Palette,
  LayoutGrid,
} from 'lucide-react';
import type { VendorSummary } from '@shared/types';

const REAL_OPEN_VENDOR: VendorSummary = {
  id: 'rest_wrapchik_nitp',
  slug: 'wrapchik-pizza',
  name: 'Wrapchik Pizza',
  tagline: 'Best in Pizza & Burgers',
  category: 'meals',
  cuisines: ['Pizza', 'Burgers', 'Wraps', 'Waffles'],
  coverImageUrl: '/images/vendors/wrapchik-pizza.jpg',
  description: 'Gourmet Pizzas, Crispy Fried Chicken, Juicy Burgers, Loaded Wraps, Waffles & Coolers.',
  fssaiNo: '10424000000103',
  hoursJson: JSON.stringify({ open: '10:00', close: '23:00' }),
  prepMinutes: 20,
  prepMaxMinutes: 25,
  minOrderPaise: 4900,
  etaMinutes: 28,
  isOpen: true,
  nightSafe: true,
  status: 'active',
  ratingAvg: 4.5,
  ratingCount: 49,
  canDeliverToGate: true,
};

const SAMPLE_CATEGORIES = [
  { id: 'all', name: 'All Counters' },
  { id: 'meals', name: 'Meals & Biryani', imageUrl: '/images/categories/food.jpg' },
  { id: 'beverages', name: 'Juices & Shakes', imageUrl: '/images/categories/juices.jpg' },
  { id: 'snacks', name: 'Chai & Snacks', imageUrl: '/images/categories/groceries-real.jpg' },
  { id: 'raw_chicken', name: 'Fresh Chicken', imageUrl: '/images/categories/chicken-real.jpg' },
];

export function DevKitPage() {
  const { showToast } = useToast();

  // Interactive UI state
  const [shellMode, setShellMode] = useState<'both' | 'mobile' | 'desktop'>('both');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [demoToast, setDemoToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [desktopCartOpen, setDesktopCartOpen] = useState(false);
  const [activeCatId, setActiveCatId] = useState('all');
  const [menuQty, setMenuQty] = useState(1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-16">
      <SeoHead
        title="Design System V2 Kit (/dev/ui) | TreFood NIT Patna"
        description="TreFood Design System V2 showcasing Mobile & Desktop component variants, tokens, and shells."
        path="/dev/ui"
      />

      {/* Header and Control Bar */}
      <header className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-[var(--color-border)] pb-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#830020]/10 dark:bg-[#FFB400]/10 px-3 py-1 text-[13px] font-bold text-[#830020] dark:text-[#FFB400]">
            <Layers className="h-4 w-4" />
            <span>TreFood Design System v2 · Dual-Shell Architecture</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-[var(--color-text)]">
            UI Kit &amp; Component Lab
          </h1>
          <p className="text-[15px] text-[var(--color-text-muted)] max-w-2xl leading-relaxed">
            Separate, uncompromising layouts: <strong>MobileShell (&lt;768px)</strong> and{' '}
            <strong>DesktopShell (1280px grid)</strong>. Warm paper (#FBF6EE), ink (#1C1210), Fraunces display, DM Sans body, and zero developer links in customer views.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Shell Preview Mode Picker */}
          <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setShellMode('both')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-bold transition-colors ${
                shellMode === 'both'
                  ? 'bg-[#830020] text-white shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Side-by-Side</span>
            </button>
            <button
              type="button"
              onClick={() => setShellMode('mobile')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-bold transition-colors ${
                shellMode === 'mobile'
                  ? 'bg-[#830020] text-white shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Mobile (390px)</span>
            </button>
            <button
              type="button"
              onClick={() => setShellMode('desktop')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-bold transition-colors ${
                shellMode === 'desktop'
                  ? 'bg-[#830020] text-white shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>Desktop (1280px)</span>
            </button>
          </div>

          <ThemeToggle showSystemLabel />
        </div>
      </header>

      {/* Section 1: Color Tokens & Typography Scale */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
          <Palette className="h-5 w-5 text-[#830020] dark:text-[#FFB400]" />
          <h2 className="font-display text-2xl font-bold text-[var(--color-text)]">
            Design Tokens: Color, Spacing &amp; Typography
          </h2>
        </div>

        {/* Color Swatches */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border border-[var(--color-border)] bg-[#FBF6EE] p-4 text-[#1C1210] shadow-xs">
            <div className="text-[14px] font-bold">Warm Paper</div>
            <div className="font-mono text-[12px] opacity-75">#FBF6EE</div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[#FFFFFF] p-4 text-[#1C1210] shadow-xs">
            <div className="text-[14px] font-bold">Surface</div>
            <div className="font-mono text-[12px] opacity-75">#FFFFFF</div>
          </div>
          <div className="rounded-xl bg-[#830020] p-4 text-white shadow-xs">
            <div className="text-[14px] font-bold">TreFood Maroon</div>
            <div className="font-mono text-[12px] opacity-90">#830020</div>
          </div>
          <div className="rounded-xl bg-[#FFB400] p-4 text-[#1C1210] shadow-xs">
            <div className="text-[14px] font-bold">Checkout Amber</div>
            <div className="font-mono text-[12px] opacity-90">#FFB400</div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[#1C1210] p-4 text-[#FBF6EE] shadow-xs">
            <div className="text-[14px] font-bold">Campus Ink</div>
            <div className="font-mono text-[12px] opacity-75">#1C1210</div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[#6B5B54] p-4 text-white shadow-xs">
            <div className="text-[14px] font-bold">Muted</div>
            <div className="font-mono text-[12px] text-white font-bold">#6B5B54</div>
          </div>
        </div>

        {/* Typography Scale */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xs">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Display (Fraunces) · 64/44/40
            </div>
            <div className="font-display text-[36px] font-bold text-[var(--color-text)] mt-2 leading-tight">
              Hot meals at NIT Patna gates
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Body (DM Sans) · 17/16px (Min 13px)
            </div>
            <p className="text-[16px] text-[var(--color-text-muted)] mt-2 leading-relaxed">
              Order fresh chicken, rolls, juices and thalis from authentic campus counters. Verified curfew delivery windows.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Handwriting (Caveat) · 4-Digit Code
            </div>
            <div className="font-handwriting text-5xl font-black tracking-widest text-[#830020] dark:text-[#FFB400] mt-2">
              7482
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Component 1 & 2 - VendorCard & MenuItem */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
          <h2 className="font-display text-2xl font-bold text-[var(--color-text)]">
            1. VendorCard &amp; 2. MenuItem
          </h2>
          <span className="text-[13px] text-[var(--color-text-muted)]">
            Mobile list card vs Desktop 4:3 &amp; 1:1 image cards
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Mobile Shell Frame */}
          {(shellMode === 'both' || shellMode === 'mobile') && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[14px] font-bold text-[#830020] dark:text-[#FFB400]">
                <Smartphone className="h-4 w-4" />
                <span>Mobile Shell Variant (390px Viewport)</span>
              </div>
              <div className="max-w-[390px] mx-auto rounded-[28px] border-4 border-stone-800 bg-[var(--color-canvas-paper)] p-4 shadow-xl space-y-4">
                <MobileVendorCard
                  vendor={REAL_OPEN_VENDOR}
                  onClick={() => showToast('Tapped Mobile Vendor Card', 'info')}
                />
                <MobileMenuItem
                  name="Paneer Tikka Roll"
                  description="Spiced paneer cubes with mint sauce wrapped in whole wheat rumali roti."
                  pricePaise={12000}
                  isVeg={true}
                  inStock={true}
                  imageUrl="/images/vendors/wrapchik-pizza.jpg"
                  quantity={menuQty}
                  onAdd={() => setMenuQty(1)}
                  onIncrease={() => setMenuQty((q) => q + 1)}
                  onDecrease={() => setMenuQty((q) => Math.max(0, q - 1))}
                />
              </div>
            </div>
          )}

          {/* Desktop Shell Frame */}
          {(shellMode === 'both' || shellMode === 'desktop') && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[14px] font-bold text-[#830020] dark:text-[#FFB400]">
                <Monitor className="h-4 w-4" />
                <span>Desktop Shell Variant (1280px Grid)</span>
              </div>
              <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xs space-y-6">
                <div className="max-w-md">
                  <DesktopVendorCard
                    vendor={REAL_OPEN_VENDOR}
                    onClick={() => showToast('Clicked Desktop Vendor Card', 'info')}
                  />
                </div>
                <DesktopMenuItem
                  name="Paneer Tikka Roll"
                  description="Spiced paneer cubes with mint sauce wrapped in whole wheat rumali roti."
                  pricePaise={12000}
                  isVeg={true}
                  inStock={true}
                  imageUrl="/images/vendors/wrapchik-pizza.jpg"
                  quantity={menuQty}
                  onAdd={() => setMenuQty(1)}
                  onIncrease={() => setMenuQty((q) => q + 1)}
                  onDecrease={() => setMenuQty((q) => Math.max(0, q - 1))}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 3: Component 3 & 4 - CategoryNav & CartSummary */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
          <h2 className="font-display text-2xl font-bold text-[var(--color-text)]">
            3. CategoryNav &amp; 4. CartSummary
          </h2>
          <span className="text-[13px] text-[var(--color-text-muted)]">
            Horizontal snap carousel vs Desktop grid &amp; Slide-over panel
          </span>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-[14px] font-bold text-[var(--color-text-muted)]">Mobile Category Pills</h3>
            <MobileCategoryNav
              categories={SAMPLE_CATEGORIES}
              activeCategoryId={activeCatId}
              onSelectCategory={setActiveCatId}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-[14px] font-bold text-[var(--color-text-muted)]">Desktop Category Nav Tiles</h3>
            <DesktopCategoryNav
              categories={SAMPLE_CATEGORIES}
              activeCategoryId={activeCatId}
              onSelectCategory={setActiveCatId}
            />
          </div>

          <div className="pt-4 flex flex-wrap items-center gap-4">
            <Button
              variant="primary"
              onClick={() => setDesktopCartOpen(true)}
            >
              Open Desktop Slide-Over Cart Panel
            </Button>
            <span className="text-[13px] text-[var(--color-text-muted)]">
              (Simulates 250ms slide-in cart summary on desktop)
            </span>
          </div>

          {/* Inline Mobile Cart Bar preview */}
          <div className="max-w-md mx-auto pt-4">
            <h3 className="text-[14px] font-bold text-[var(--color-text-muted)] mb-2">
              Mobile Floating Cart Summary Bar
            </h3>
            <div className="relative h-20 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-2">
              <MobileCartSummary
                itemCount={3}
                totalPaise={36000}
                vendorName="Wrapchik Pizza"
                onOpenCart={() => showToast('Tapped Mobile Cart Bar', 'info')}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Component 5 & 6 - GateStatus & OrderStatus */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
          <h2 className="font-display text-2xl font-bold text-[var(--color-text)]">
            5. GateStatus &amp; 6. OrderStatus
          </h2>
          <span className="text-[13px] text-[var(--color-text-muted)]">
            Curfew aware gates and Handover Marker Code tracking
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Mobile Gate & Order Status */}
          <div className="space-y-4">
            <h3 className="text-[14px] font-bold text-[#830020] dark:text-[#FFB400]">Mobile Handover Flow</h3>
            <div className="max-w-[390px] mx-auto rounded-[28px] border-4 border-stone-800 bg-[var(--color-canvas-paper)] p-4 shadow-xl space-y-4">
              <MobileGateStatus
                gateName="Boys Hostel Gate"
                curfewTime="19:30"
                countdownMinutes={25}
                onClick={() => showToast('Gate picker trigger', 'info')}
              />
              <MobileOrderStatus
                orderNo="TRF-8821"
                status="at_gate"
                handoverCode="9314"
                vendorName="Wrapchik Pizza"
                gateName="Boys Hostel Gate"
                remainingWindowSeconds={420}
                onConfirmDelivery={() => showToast('Confirmed packet received!', 'success')}
              />
            </div>
          </div>

          {/* Desktop Order Status */}
          <div className="space-y-4">
            <h3 className="text-[14px] font-bold text-[#830020] dark:text-[#FFB400]">Desktop Order Chit &amp; Timeline</h3>
            <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xs">
              <DesktopGateStatus
                gateName="Boys Hostel Gate"
                is24x7={false}
                curfewTime="19:30"
                countdownMinutes={25}
              />
              <div className="mt-6">
                <DesktopOrderStatus
                  orderNo="TRF-8821"
                  status="at_gate"
                  handoverCode="9314"
                  vendorName="Wrapchik Pizza"
                  gateName="Boys Hostel Gate"
                  totalPaise={36000}
                  remainingWindowSeconds={420}
                  onConfirmDelivery={() => showToast('Confirmed packet received!', 'success')}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Component 7, 8, 9, 10 - Sheet, Dialog, Toast, EmptyState, Skeleton */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
          <h2 className="font-display text-2xl font-bold text-[var(--color-text)]">
            7. Sheet, 8. Dialog, 9. Toast, 10. EmptyState &amp; Skeleton
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Open Mobile Sheet (Bottom Slide)
          </Button>
          <Button variant="primary" onClick={() => setDialogOpen(true)}>
            Open Desktop Dialog (Centered Modal)
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setDemoToast({ message: 'Order TRF-8821 placed successfully!', type: 'success' });
            }}
          >
            Trigger Toast Notification
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {/* Empty State */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h3 className="text-[14px] font-bold text-[var(--color-text-muted)] mb-2">EmptyState Component</h3>
            <EmptyStateV2
              icon={<UtensilsCrossed className="h-6 w-6" />}
              title="No active campus orders"
              description="When you order from Wrapchik, CSB, or Nescafe, your active packet will show up here."
              actionLabel="Explore Campus Counters"
              onAction={() => showToast('Action button clicked', 'info')}
            />
          </div>

          {/* Skeleton Match */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
            <h3 className="text-[14px] font-bold text-[var(--color-text-muted)]">Skeleton Matchers</h3>
            <div className="space-y-2">
              <div className="text-[12px] font-bold text-[var(--color-text-muted)]">Mobile Skeleton:</div>
              <MobileCardSkeleton />
            </div>
            <div className="space-y-2 pt-2">
              <div className="text-[12px] font-bold text-[var(--color-text-muted)]">Desktop Skeleton:</div>
              <DesktopCardSkeleton />
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Overlays */}
      <SheetV2
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Mobile Options Sheet"
        description="Used for dish variants, addon choices and custom notes on phone viewports."
      >
        <div className="space-y-4 py-2">
          <p className="text-[14px] text-[var(--color-text-muted)]">
            This sheet animates in 250ms with an ease-out curve, supports swipe/escape dismissal, and ensures a generous 44px touch target.
          </p>
          <Button className="w-full" onClick={() => setSheetOpen(false)}>
            Close Sheet
          </Button>
        </div>
      </SheetV2>

      <DialogV2
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Desktop Modal Dialog"
        description="Centered 20px radius card with 250ms soft warm backdrop."
      >
        <div className="space-y-4 py-2">
          <p className="text-[15px] text-[var(--color-text-muted)]">
            Used for checkout confirmations, gate changes, and multi-vendor bag warnings on desktop screens.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setDialogOpen(false)}>
              Confirm
            </Button>
          </div>
        </div>
      </DialogV2>

      {demoToast && (
        <ToastV2
          message={demoToast.message}
          type={demoToast.type}
          onDismiss={() => setDemoToast(null)}
        />
      )}

      <DesktopCartSummary
        open={desktopCartOpen}
        onClose={() => setDesktopCartOpen(false)}
        vendorName="Wrapchik Pizza"
        items={[
          {
            itemId: 'item_1',
            name: 'Paneer Tikka Roll',
            pricePaise: 12000,
            quantity: 2,
            isVeg: true,
          },
          {
            itemId: 'item_2',
            name: 'Cold Coffee Frappe',
            pricePaise: 12000,
            quantity: 1,
            isVeg: true,
          },
        ]}
        subtotalPaise={36000}
        packingTotalPaise={1000}
        totalPaise={37000}
        gateName="Boys Hostel Gate"
        gateCurfewLabel="Curfew at 19:30 IST"
        onIncrease={() => {}}
        onDecrease={() => {}}
        onCheckout={() => {
          setDesktopCartOpen(false);
          showToast('Proceeding to gate drop checkout', 'success');
        }}
      />
    </div>
  );
}

export default DevKitPage;
