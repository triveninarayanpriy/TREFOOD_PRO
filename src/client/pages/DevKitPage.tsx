import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Checkbox } from '../components/ui/Checkbox';
import { Badge, Chip, Card } from '../components/ui/Badge';
import { VendorCard } from '../components/ui/VendorCard';
import { MenuItemRow } from '../components/ui/MenuItemRow';
import { QuantityStepper } from '../components/ui/QuantityStepper';
import { Dialog } from '../components/ui/Dialog';
import { Sheet } from '../components/ui/Sheet';
import { useToast } from '../components/ui/Toast';
import { VendorCardSkeleton, MenuItemSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { CurfewBanner } from '../components/ui/CurfewBanner';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { StatusTimeline } from '../components/ui/StatusTimeline';
import { CodeDisplay } from '../components/ui/CodeDisplay';
import { HandoverTicket, type TicketStatus } from '../components/ui/HandoverTicket';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { ShoppingBag, Heart, Bell, ShieldCheck } from 'lucide-react';
import type { VendorSummary } from '@shared/types';

const DEMO_OPEN_VENDOR: VendorSummary = {
  id: 'demo_v1',
  slug: 'ganga-dhaba',
  name: 'Ganga Dhaba & Kitchen',
  nameHi: 'गंगा ढाबा',
  category: 'meals',
  description: 'North Indian thalis, fresh rotis, paneer curries and biryani delivered warm to your gate.',
  fssaiNo: '10421000001234',
  hoursJson: JSON.stringify({ open: '10:00', close: '23:00' }),
  prepMinutes: 20,
  etaMinutes: 28,
  isOpen: true,
  nightSafe: true,
  status: 'active',
  ratingAvg: 4.6,
  ratingCount: 184,
  canDeliverToGate: true,
};

const DEMO_CLOSED_VENDOR: VendorSummary = {
  id: 'demo_v2',
  slug: 'patna-fresh-meat',
  name: 'Patna Fresh Poultry & Raw Meat',
  category: 'raw_chicken',
  description: 'Hygienic curry cut chicken, boneless breast, and farm eggs.',
  fssaiNo: '10421000001239',
  hoursJson: JSON.stringify({ open: '08:00', close: '20:00' }),
  prepMinutes: 15,
  isOpen: false,
  nightSafe: false,
  status: 'active',
  ratingAvg: 4.3,
  ratingCount: 82,
  canDeliverToGate: false,
};

export function DevKitPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [menuRowQty, setMenuRowQty] = useState(0);
  const [checked, setChecked] = useState(true);
  const [selectedChip, setSelectedChip] = useState<'all' | 'meals' | 'fruits'>('meals');
  const [statusStep, setStatusStep] = useState<TicketStatus>('at_gate');
  const [showErrorBanner, setShowErrorBanner] = useState(true);
  const { resolvedTheme } = useTheme();
  const { showToast } = useToast();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#830020]/10 px-3 py-1 text-xs font-bold text-[#830020] dark:bg-[#FFB400]/15 dark:text-[#FFB400] mb-2">
            <span>Storybook Component Gallery • /dev/ui</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
            TreFood Design System & Component Kit
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Brand Maroon #830020, Amber CTA #FFB400, Warm Cream Light / Deep Maroon-Black Dark, 44px+ WCAG AA touch targets. Current theme: <strong className="uppercase">{resolvedTheme}</strong>.
          </p>
        </div>
        <ThemeToggle showSystemLabel />
      </div>

      {/* 1. Brand Color Tokens */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--color-text)]">1. Design Tokens & Contrast Pairs</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-2xl bg-[#830020] p-4 text-white shadow-xs">
            <div className="text-xs font-bold">Primary Maroon</div>
            <div className="font-mono text-[11px] opacity-90">#830020 / #FFF</div>
          </div>
          <div className="rounded-2xl bg-[#FFB400] p-4 text-[#1C1917] shadow-xs">
            <div className="text-xs font-bold">Primary CTA Amber</div>
            <div className="font-mono text-[11px]">#FFB400 / #1C1917</div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[#FAF6EE] p-4 text-[#1C1917]">
            <div className="text-xs font-bold">Cream Canvas</div>
            <div className="font-mono text-[11px] text-[#57534E]">#FAF6EE / #1C1917</div>
          </div>
          <div className="rounded-2xl border border-[#46232D] bg-[#0E0608] p-4 text-[#FAF7F5]">
            <div className="text-xs font-bold">Maroon-Black Dark</div>
            <div className="font-mono text-[11px] text-[#D6C2C7]">#0E0608 / #FAF7F5</div>
          </div>
          <div className="rounded-2xl border border-[#86EFAC] bg-[#ECFDF5] p-4 text-[#14532D]">
            <div className="text-xs font-bold">Veg / Success</div>
            <div className="font-mono text-[11px]">#ECFDF5 / #14532D</div>
          </div>
          <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-[#991B1B]">
            <div className="text-xs font-bold">Non-veg / Danger</div>
            <div className="font-mono text-[11px]">#FEF2F2 / #991B1B</div>
          </div>
        </div>
      </section>

      {/* 2. Buttons, IconButtons, Chips & Badges */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--color-text)]">2. Buttons, IconButton, Chips & Badges</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Button & IconButton Variants
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="primary">Primary Maroon</Button>
              <Button variant="amber">Amber Checkout CTA</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" loading>
                Processing
              </Button>
              <Button variant="primary" size="vendor">
                Vendor 56px
              </Button>
              <IconButton
                variant="secondary"
                label="Favorite vendor"
                icon={<Heart className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" />}
              />
              <IconButton
                variant="secondary"
                label="Notifications"
                icon={<Bell className="h-4 w-4" />}
              />
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Semantic Badges & Count Chips
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="veg" />
              <Badge variant="nonveg" />
              <Badge variant="night_safe" />
              <Badge variant="closed" />
              <Badge variant="success">Open 24x7</Badge>
              <Badge variant="warning">Closes in 25m</Badge>
              <Badge variant="brand">NITP Verified</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Chip
                label="All Canteens"
                count={12}
                selected={selectedChip === 'all'}
                onClick={() => setSelectedChip('all')}
              />
              <Chip
                label="Meals"
                count={5}
                selected={selectedChip === 'meals'}
                onClick={() => setSelectedChip('meals')}
              />
              <Chip
                label="Fruits & Juices"
                count={3}
                selected={selectedChip === 'fruits'}
                onClick={() => setSelectedChip('fruits')}
              />
              <Chip label="Empty Match" count={0} disabled />
            </div>
          </Card>
        </div>
      </section>

      {/* 3. VendorCards & MenuItemRow */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--color-text)]">
          3. VendorCard (Open & Closed Variants) & MenuItemRow
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              VendorCard — Open Variant
            </div>
            <VendorCard
              vendor={DEMO_OPEN_VENDOR}
              variant="open"
              onClick={() => showToast('Navigated to Ganga Dhaba menu', 'info')}
            />
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] pt-2">
              VendorCard — Compact Closed Variant
            </div>
            <VendorCard
              vendor={DEMO_CLOSED_VENDOR}
              variant="closed"
              onNotify={() => showToast('We will notify you when Patna Fresh Poultry opens', 'success')}
              onClick={() => showToast('Viewing closed vendor schedule', 'info')}
            />
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              MenuItemRow & QuantityStepper
            </div>
            <MenuItemRow
              name="Paneer Butter Masala + 2 Naan"
              nameHi="पनीर बटर मसाला"
              description="Rich creamy tomato cashew gravy with two soft butter tandoori naan."
              pricePaise={16000}
              isVeg={true}
              inStock={true}
              category="meals"
              quantity={menuRowQty}
              onAdd={() => setMenuRowQty(1)}
              onIncrease={() => setMenuRowQty((q) => q + 1)}
              onDecrease={() => setMenuRowQty((q) => Math.max(0, q - 1))}
            />
            <MenuItemRow
              name="Curry Cut Chicken (500g)"
              description="Hygienically packed chilled poultry cut ready for hostel cooking."
              pricePaise={14500}
              isVeg={false}
              inStock={false}
              category="raw_chicken"
              quantity={0}
            />
            <Card className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--color-text)]">
                Standalone QuantityStepper:
              </span>
              <QuantityStepper
                value={qty}
                onIncrease={() => setQty((q) => q + 1)}
                onDecrease={() => setQty((q) => Math.max(0, q - 1))}
              />
            </Card>
          </div>
        </div>
      </section>

      {/* 4. Forms, Banners, Skeletons, Dialog & Sheet */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--color-text)]">
          4. Banners, Inputs, Dialogs, Sheets & Skeletons
        </h2>
        <div className="space-y-3">
          <OfflineBanner forceVisible />
          <CurfewBanner
            gateName="Boys Hostel Gate"
            curfewTime="19:30"
            bufferMinutes={15}
            isNearingCurfew={true}
            onSwitchGate={() => showToast('Switched to Main Gate / Academic Blocks (24x7)', 'success')}
          />
          {showErrorBanner && (
            <ErrorBanner
              title="Campus network hiccup"
              message="Could not sync cart totals with server. Retry safely without creating duplicate orders."
              onRetry={() => showToast('Retrying request...', 'info')}
              onDismiss={() => setShowErrorBanner(false)}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <Card className="space-y-4">
            <Input label="Student Campus Email" placeholder="2104055@nitp.ac.in" />
            <Select
              label="Preferred Hostel Gate"
              options={[
                { value: 'gate_main', label: 'Main Gate / Academic Blocks (Open 24x7)' },
                { value: 'gate_h5', label: 'Boys Hostel Gate (Closes 19:30 IST)' },
                { value: 'gate_h7', label: 'Girls Hostel Gate (Closes 19:30 IST)' },
              ]}
            />
            <Checkbox
              label="Send WhatsApp / Web Push alert when packet reaches gate"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setDialogOpen(true)}>
                Open Dialog
              </Button>
              <Button variant="secondary" onClick={() => setSheetOpen(true)}>
                Open Bottom Sheet
              </Button>
              <Button variant="amber" onClick={() => showToast('Added Paneer Butter Masala to packet!', 'success')}>
                Show Toast
              </Button>
            </div>
          </Card>

          <div className="space-y-3">
            <VendorCardSkeleton />
            <MenuItemSkeleton />
            <EmptyState
              icon={<ShoppingBag className="h-6 w-6" />}
              title="No active orders yet"
              description="Orders you place with NIT Patna vendors appear here with your 4-digit handover code."
              actionLabel="Browse Canteens"
              onAction={() => showToast('Opening canteens...', 'info')}
              className="p-5"
            />
          </div>
        </div>
      </section>

      {/* 5. Signature Handover Code, Ticket & StatusTimeline */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-[var(--color-text)]">
            5. Signature 4-Digit CodeDisplay, HandoverTicket & StatusTimeline
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {(['placed', 'accepted', 'out_for_delivery', 'at_gate', 'delivered'] as const).map((s) => (
              <Chip
                key={s}
                label={s.replace(/_/g, ' ')}
                selected={statusStep === s}
                onClick={() => setStatusStep(s)}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <HandoverTicket
              orderNo="TF-4821"
              handoverCode="4821"
              vendorName="Ganga Dhaba & Kitchen"
              gateName="Main Gate / Academic Blocks"
              status={statusStep}
              etaMinutes={14}
              totalPaise={19500}
              showVibrate={false}
            />
          </div>
          <div className="lg:col-span-7 space-y-4">
            <CodeDisplay code="4821" />
            <StatusTimeline status={statusStep} showNightSafeNotice={true} etaText="ETA ~14 mins" />
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xs text-[var(--color-text-muted)]">
              <ShieldCheck className="h-4 w-4 text-[#15803D] shrink-0" aria-hidden="true" />
              <span>
                Zero-trust gate confirmation: Orders cannot be marked delivered on the server without code matching.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Modals for interactive preview */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Single-Vendor Cart Rule"
        description="Your packet currently has items from Ganga Dhaba & Kitchen."
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-[var(--color-text-muted)]">
            Ordering from two canteens at once adds waiting delays at the gate. Start a fresh packet?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Keep Current
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setDialogOpen(false);
                showToast('Started new packet', 'success');
              }}
            >
              Start Fresh Packet
            </Button>
          </div>
        </div>
      </Dialog>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Item Customization Sheet"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--color-text-muted)]">
            Bottom sheet adapts smoothly from mobile drawer (390px) to centered sheet on desktop (1440px).
          </p>
          <Button variant="amber" className="w-full" onClick={() => setSheetOpen(false)}>
            Done Previewing
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
