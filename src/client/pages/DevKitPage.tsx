import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Checkbox } from '../components/ui/Checkbox';
import { Badge, Chip, Card } from '../components/ui/Badge';
import { GateBoard } from '../components/ui/GateBoard';
import { VendorCounterRow } from '../components/ui/VendorCounterRow';
import { MenuLineRow } from '../components/ui/MenuLineRow';
import { PaperBill } from '../components/ui/PaperBill';
import { PacketChit, type PacketChitStatus } from '../components/ui/PacketChit';
import { VendorCard } from '../components/ui/VendorCard';
import { MenuItemRow } from '../components/ui/MenuItemRow';
import { QuantityStepper } from '../components/ui/QuantityStepper';
import { Dialog } from '../components/ui/Dialog';
import { Sheet } from '../components/ui/Sheet';
import { useToast } from '../components/ui/Toast';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { CurfewBanner } from '../components/ui/CurfewBanner';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { StatusTimeline } from '../components/ui/StatusTimeline';
import { HandoverTicket } from '../components/ui/HandoverTicket';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { SeoHead } from '../components/seo/SeoHead';
import { useTheme } from '../context/ThemeContext';
import { ShoppingBag, Heart, Bell, ShieldCheck } from 'lucide-react';
import type { Gate } from '@shared/schemas';
import type { VendorSummary } from '@shared/types';

const REAL_GATES: Gate[] = [
  {
    id: 'gate_main',
    campusId: 'campus_nitp',
    name: 'Main Gate / Academic Blocks',
    curfewTime: '23:59',
    bufferMinutes: 15,
    travelMinutes: 8,
    active: true,
    is24x7: true,
  },
  {
    id: 'gate_h5',
    campusId: 'campus_nitp',
    name: 'Boys Hostel Gate',
    curfewTime: '19:30',
    bufferMinutes: 15,
    travelMinutes: 10,
    active: true,
    is24x7: false,
  },
  {
    id: 'gate_h7',
    campusId: 'campus_nitp',
    name: 'Girls Hostel Gate',
    curfewTime: '19:30',
    bufferMinutes: 15,
    travelMinutes: 12,
    active: true,
    is24x7: false,
  },
];

const REAL_OPEN_VENDOR: VendorSummary = {
  id: 'rest_wrapchik_nitp',
  slug: 'wrapchik-pizza',
  name: 'Wrapchik Pizza',
  tagline: 'Best in Pizza',
  category: 'meals',
  cuisines: ['Pizza', 'Burgers', 'Wraps', 'Crispy Chicken', 'Waffles', 'Fries'],
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

const REAL_CLOSED_VENDOR: VendorSummary = {
  id: 'rest_vrindavan_bhog_nitp',
  slug: 'vrindavan-bhog',
  name: 'Vrindavan Bhog',
  tagline: 'Best in Pure Vegetarian',
  category: 'meals',
  cuisines: ['Pure Vegetarian', 'North Indian', 'South Indian', 'Chinese', 'Thali'],
  coverImageUrl: '/images/vendors/vrindavan-bhog.jpg',
  description: 'Special Thalis, Paneer & Mushroom delicacies, South Indian dosas, Soups and Indo-Chinese fast food.',
  fssaiNo: '10424000000107',
  hoursJson: JSON.stringify({ open: '10:00', close: '21:00' }),
  prepMinutes: 20,
  minOrderPaise: 49900,
  isOpen: false,
  nightSafe: true,
  dineInAvailable: true,
  status: 'active',
  ratingAvg: 4.8,
  ratingCount: 35,
  canDeliverToGate: false,
};

export function DevKitPage() {
  const [selectedGateId, setSelectedGateId] = useState('gate_main');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [qty, setQty] = useState(2);
  const [menuLineQty, setMenuLineQty] = useState(1);
  const [checked, setChecked] = useState(true);
  const [selectedChip, setSelectedChip] = useState<'all' | 'food' | 'fruits'>('food');
  const [statusStep, setStatusStep] = useState<PacketChitStatus>('at_gate');
  const [showErrorBanner, setShowErrorBanner] = useState(true);
  const { resolvedTheme } = useTheme();
  const { showToast } = useToast();

  const selectedGateName =
    REAL_GATES.find((g) => g.id === selectedGateId)?.name || 'Main Gate / Academic Blocks';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-12">
      <SeoHead
        title="Gate Board & Packet Chit Design Kit (/dev/ui) | TreFood NIT Patna"
        description="TreFood Gate Board and Packet Chit design tokens, typography, and five signature components in light paper and dark ink themes."
        path="/dev/ui"
      />

      {/* Editorial Notice-Board Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-[var(--color-text)] pb-6">
        <div className="space-y-1.5">
          <div className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#830020] dark:text-[#FFB400]">
            NIT Patna Design System · Gate Board &amp; Packet Chit
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--color-text)]">
            TreFood Component &amp; Print Kit
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">
            Warm paper (#FBF6EE) and ink (#1C1210), Fraunces display, DM Sans body, Noto Sans Devanagari for Hinglish, and Caveat handwriting strictly for packet codes. Theme:{' '}
            <strong className="uppercase">{resolvedTheme}</strong>.
          </p>
        </div>
        <ThemeToggle showSystemLabel />
      </header>

      {/* Palette & Typography Tokens */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
          Paper Tokens &amp; Type Specimen
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-lg border border-[var(--color-border)] bg-[#FBF6EE] p-3.5 text-[#1C1210]">
            <div className="text-xs font-bold">Warm Paper</div>
            <div className="font-mono text-[11px] text-[#5B4A44]">#FBF6EE</div>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[#1C1210] p-3.5 text-[#FBF6EE]">
            <div className="text-xs font-bold">Campus Ink</div>
            <div className="font-mono text-[11px] text-[#DBCRC6]">#1C1210</div>
          </div>
          <div className="rounded-lg bg-[#830020] p-3.5 text-white">
            <div className="text-xs font-bold">TreFood Maroon</div>
            <div className="font-mono text-[11px] opacity-90">#830020</div>
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]">
            <div className="h-3 w-full bg-[#B5651D]" aria-hidden="true" />
            <div className="p-3">
              <div className="text-xs font-bold">Chai Brown</div>
              <div className="font-mono text-[11px] text-[var(--color-text-muted)]">#B5651D</div>
            </div>
          </div>
          <div className="rounded-lg bg-[#FFB400] p-3.5 text-[#1C1210]">
            <div className="text-xs font-bold">Primary Action</div>
            <div className="font-mono text-[11px]">#FFB400</div>
          </div>
          <div className="rounded-lg border border-[#44312B] bg-[#140D0B] p-3.5 text-[#FBF6EE]">
            <div className="text-xs font-bold">Opt-in Dark</div>
            <div className="font-mono text-[11px] text-[#DBCRC6]">#140D0B</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl p-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
              Display · Fraunces
            </div>
            <div className="font-display text-2xl font-bold mt-1">One App at Your Gate</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
              Body + Hinglish · DM Sans &amp; Devanagari
            </div>
            <div className="text-sm font-medium mt-1">
              Zero delivery fee · आपका पैकेट गेट पर तैयार है
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
              Chit Code Only · Caveat
            </div>
            <div className="font-handwriting text-3xl font-bold text-[#830020] dark:text-[#FFB400] mt-0.5">
              4821 — Show at gate
            </div>
          </div>
        </div>
      </section>

      {/* Signature Component #1: GateBoard */}
      <section className="space-y-3 tf-stagger-in">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
            1. Gate Board (Departure Strip)
          </h2>
          <span className="font-mono text-xs text-[var(--color-text-muted)]">
            Selected: {selectedGateName}
          </span>
        </div>
        <GateBoard
          gates={REAL_GATES}
          selectedGateId={selectedGateId}
          onSelectGate={(g) => setSelectedGateId(g.id)}
        />
      </section>

      {/* Signature Component #2: VendorCounterRow */}
      <section className="space-y-3 tf-stagger-in">
        <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
          2. Counter Rows (4:3 Photo + Printed Counter Line)
        </h2>
        <div className="space-y-3">
          <VendorCounterRow
            vendor={REAL_OPEN_VENDOR}
            onClick={() => showToast('Opened Wrapchik Pizza menu', 'info')}
            onToggleFavorite={() => showToast('Updated saved vendors', 'success')}
          />
          <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
            <VendorCounterRow
              vendor={REAL_CLOSED_VENDOR}
              onClick={() => showToast('Viewing Vrindavan Bhog hours', 'info')}
              onNotify={() => showToast('Reminder saved for Vrindavan Bhog', 'success')}
              onPreOrder={() => showToast('Opening Vrindavan Bhog pre-order', 'info')}
            />
          </div>
        </div>
      </section>

      {/* Signature Component #3 & #4: MenuLineRow + PaperBill */}
      <section className="space-y-4 tf-stagger-in">
        <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
          3 &amp; 4. Dotted-Leader Menu Lines &amp; Torn-Edge Paper Bill
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2">
            <MenuLineRow
              name="Chocolate Chai"
              description="Rich cocoa-infused tea in traditional earthenware."
              pricePaise={2000}
              packingChargePaise={500}
              isVeg={true}
              inStock={true}
              isPopular={true}
              hasCustomisation={true}
              imageUrl="/images/items/chai-sutta-bar-csb--chocolate-chai.jpg"
              quantity={menuLineQty}
              onAdd={() => setMenuLineQty(1)}
              onIncrease={() => setMenuLineQty((q) => q + 1)}
              onDecrease={() => setMenuLineQty((q) => Math.max(0, q - 1))}
            />
            <MenuLineRow
              name="Nawab Dum Biryani"
              description="Spicy Hyderabadi dum biryani cooked with rich saffron masala."
              pricePaise={12900}
              isVeg={false}
              inStock={true}
              isPopular={true}
              hasCustomisation={true}
              imageUrl="/images/items/kolkata-biryani-fast-food-pizza-house--nawab-dum-biryani.webp"
              quantity={0}
              onAdd={() => showToast('Added Nawab Dum Biryani', 'success')}
            />
            <MenuLineRow
              name="Paan Chai"
              description="Refreshing betel leaf flavoured tea blend."
              pricePaise={1500}
              packingChargePaise={500}
              isVeg={true}
              inStock={false}
              imageUrl="/images/items/chai-sutta-bar-csb--paan-chai.jpg"
              quantity={0}
            />
          </div>

          <div className="lg:col-span-5">
            <PaperBill
              vendorName="Chai Sutta Bar (CSB)"
              gateName={selectedGateName}
              items={[
                { id: '1', label: 'Chocolate Chai', qty: menuLineQty || 1, amountPaise: 2000 * (menuLineQty || 1) },
                { id: '2', label: 'Veg Burger', qty: 1, amountPaise: 7000 },
              ]}
              subtotalPaise={7000 + 2000 * (menuLineQty || 1)}
              packingTotalPaise={1000}
              discountPaise={0}
              minOrderPaise={3900}
              totalPaise={8000 + 2000 * (menuLineQty || 1)}
              footerAction={
                <Button variant="amber" className="w-full" onClick={() => showToast('Ready for gate checkout', 'success')}>
                  Proceed to Checkout
                </Button>
              }
            />
          </div>
        </div>
      </section>

      {/* Signature Component #5: PacketChit */}
      <section className="space-y-4 tf-stagger-in">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
            5. Packet Chit (Flipping Handwritten Code) &amp; Timeline
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
            <PacketChit
              orderNo="TF-4821"
              handoverCode="4821"
              vendorName="Wrapchik Pizza"
              gateName={selectedGateName}
              status={statusStep}
              etaMinutes={14}
              totalPaise={12900}
              itemSummary="Margherita Pizza ×1 · +₹10 packing"
            />
          </div>
          <div className="lg:col-span-7 space-y-4">
            <StatusTimeline status={statusStep} showNightSafeNotice={true} etaText="ETA ~14 min" />
            <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xs text-[var(--color-text-muted)]">
              <ShieldCheck className="h-4 w-4 text-[#15803D] shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>
                Zero-trust gate confirmation: Orders cannot be marked delivered on the server until all 4 digits match.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Controls, Banners & Legacy Compatibility Check */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
          Core Controls, Dialogs &amp; State Banners
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
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary">Brand Maroon</Button>
              <Button variant="amber">Amber Primary Action</Button>
              <Button variant="secondary">Secondary</Button>
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

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="veg" />
              <Badge variant="nonveg" />
              <Badge variant="night_safe" />
              <Badge variant="closed" />
              <Chip label="All" count={8} selected={selectedChip === 'all'} onClick={() => setSelectedChip('all')} />
              <Chip label="Food" count={8} selected={selectedChip === 'food'} onClick={() => setSelectedChip('food')} />
              <Chip label="Fruits & Juices" count={2} selected={selectedChip === 'fruits'} onClick={() => setSelectedChip('fruits')} />
            </div>

            <Input label="Student Campus Email" placeholder="rollno@nitp.ac.in" />
            <Select
              label="Preferred Hostel Gate"
              options={[
                { value: 'gate_main', label: 'Main Gate / Academic Blocks (Open 24x7)' },
                { value: 'gate_h5', label: 'Boys Hostel Gate (Closes 19:30 IST)' },
                { value: 'gate_h7', label: 'Girls Hostel Gate (Closes 19:30 IST)' },
              ]}
            />
            <Checkbox
              label="Send Web Push alert when packet reaches gate"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setDialogOpen(true)}>Open Dialog</Button>
              <Button variant="secondary" onClick={() => setSheetOpen(true)}>Open Sheet</Button>
              <QuantityStepper
                value={qty}
                onIncrease={() => setQty((q) => q + 1)}
                onDecrease={() => setQty((q) => Math.max(0, q - 1))}
              />
            </div>
          </Card>

          <div className="space-y-4">
            <VendorCard vendor={REAL_OPEN_VENDOR} variant="open" />
            <MenuItemRow
              name="Veg Burger"
              description="Crispy seasoned veg patty with lettuce and creamy sauce."
              pricePaise={7000}
              isVeg={true}
              inStock={true}
              imageUrl="/images/items/chai-sutta-bar-csb--veg-burger.jpg"
              quantity={1}
              onAdd={() => {}}
              onIncrease={() => {}}
              onDecrease={() => {}}
            />
            <HandoverTicket
              orderNo="TF-4821"
              handoverCode="4821"
              vendorName="Chai Sutta Bar (CSB)"
              gateName="Main Gate / Academic Blocks"
              status={statusStep}
              etaMinutes={14}
              totalPaise={9000}
              showVibrate={false}
            />
            <EmptyState
              icon={<ShoppingBag className="h-6 w-6" />}
              title="No active orders yet"
              description="Orders you place with NIT Patna vendors appear here with your 4-digit packet code."
              actionLabel="Browse Menus"
              onAction={() => showToast('Opening NIT Patna menus...', 'info')}
              className="p-4"
            />
          </div>
        </div>
      </section>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Single-Vendor Cart Rule"
        description="Your packet currently has items from Chai Sutta Bar (CSB)."
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-[var(--color-text-muted)]">
            Ordering from two counters adds waiting delays at the gate. Start a fresh bill with Wrapchik Pizza?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Keep Current</Button>
            <Button variant="amber" onClick={() => { setDialogOpen(false); showToast('Started new bill', 'success'); }}>
              Start Fresh Bill
            </Button>
          </div>
        </div>
      </Dialog>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Item Options">
        <div className="space-y-4">
          <p className="text-xs text-[var(--color-text-muted)]">
            Bottom sheet adapts smoothly from mobile drawer (390px) to centered dialog on desktop (1440px).
          </p>
          <Button variant="amber" className="w-full" onClick={() => setSheetOpen(false)}>Done Previewing</Button>
        </div>
      </Sheet>
    </div>
  );
}
