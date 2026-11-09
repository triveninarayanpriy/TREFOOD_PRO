import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Checkbox } from '../components/ui/Checkbox';
import { Badge, Chip, Card } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/Toast';
import { VendorCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { CurfewBanner } from '../components/ui/CurfewBanner';
import { Stepper } from '../components/ui/Stepper';
import { QtyStepper } from '../components/ui/QtyStepper';
import { HandoverTicket } from '../components/ui/HandoverTicket';
import {
  MealsIllustration,
  FruitsIllustration,
  GroceriesIllustration,
  VegetablesIllustration,
  RawChickenIllustration,
  LateNightIllustration,
} from '../components/illustrations';
import { ShoppingBag, Heart, Sun, Moon } from 'lucide-react';

export function DevKitPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [checked, setChecked] = useState(false);
  const [chipSelected, setChipSelected] = useState(true);
  const [statusStep, setStatusStep] = useState<'placed' | 'accepted' | 'out_for_delivery' | 'at_gate' | 'delivered'>('at_gate');
  const [isDark, setIsDark] = useState(false);
  const { showToast } = useToast();

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-10">
      <div className="flex items-center justify-between border-b border-stone-200 pb-4 dark:border-stone-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            TreFood Design System & Component Kit (/dev/kit)
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Brand Maroon #830020, Accent Gold #F2A900, 44px+ touch targets, WCAG AA compliant.
          </p>
        </div>
        <Button onClick={toggleDarkMode} variant="secondary" size="sm">
          {isDark ? <Sun className="h-4 w-4 mr-1.5" /> : <Moon className="h-4 w-4 mr-1.5" />}
          {isDark ? 'Light mode' : 'Dark mode'}
        </Button>
      </div>

      {/* Signature Handover Ticket */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">Signature Handover Ticket</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {(['placed', 'accepted', 'out_for_delivery', 'at_gate', 'delivered'] as const).map((s) => (
            <Chip
              key={s}
              label={s}
              selected={statusStep === s}
              onClick={() => setStatusStep(s)}
            />
          ))}
        </div>
        <div className="max-w-md">
          <HandoverTicket
            orderNo="TF-8402"
            handoverCode="7241"
            vendorName="Ganga Canteen"
            gateName="Hostel 5 Gate"
            status={statusStep}
            eta="15 mins"
          />
        </div>
      </section>

      {/* Stepper */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">Order Stepper</h2>
        <Card>
          <Stepper currentStatus={statusStep} />
        </Card>
      </section>

      {/* Buttons */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">Buttons & Touch Targets</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="danger">Danger Button</Button>
          <Button loading>Loading...</Button>
          <IconButton icon={<Heart className="h-4 w-4" />} ariaLabel="Favorite" />
          <Button
            size="lg"
            className="min-h-[56px] text-base"
            onClick={() => showToast('Vendor button clicked! 56px touch target', 'success')}
          >
            Vendor Action (56px)
          </Button>
        </div>
      </section>

      {/* Form Controls */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">Form Controls & Inputs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Campus Email" placeholder="rollno@nitp.ac.in" />
          <Select
            label="Hostel Gate"
            options={[
              { value: 'gate_main', label: 'Main Gate (Curfew 23:30)' },
              { value: 'gate_h5', label: 'Hostel 5 Gate (Curfew 22:30)' },
              { value: 'gate_h7', label: 'Hostel 7 Gate (Curfew 23:00)' },
            ]}
          />
          <Checkbox
            label="The 4 digits on my packet match"
            description="Required before customer confirms order delivery"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Quantity Stepper:</span>
            <QtyStepper value={qty} onIncrease={() => setQty(qty + 1)} onDecrease={() => setQty(Math.max(0, qty - 1))} />
          </div>
        </div>
      </section>

      {/* Badges & Chips */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">Badges & Category Chips</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="brand">Brand Badge</Badge>
          <Badge variant="success">Veg</Badge>
          <Badge variant="danger">Non-Veg</Badge>
          <Badge variant="warning">Curfew Approaching</Badge>
          <Chip label="Meals" selected={chipSelected} onClick={() => setChipSelected(!chipSelected)} />
          <Chip label="Late Night" selected={!chipSelected} onClick={() => setChipSelected(!chipSelected)} />
        </div>
      </section>

      {/* Spot Illustrations */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">Brand Spot Illustrations (No Emoji)</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
          <Card className="flex flex-col items-center p-3">
            <MealsIllustration size={44} />
            <span className="mt-2 text-xs font-semibold">Meals</span>
          </Card>
          <Card className="flex flex-col items-center p-3">
            <FruitsIllustration size={44} />
            <span className="mt-2 text-xs font-semibold">Fruits</span>
          </Card>
          <Card className="flex flex-col items-center p-3">
            <GroceriesIllustration size={44} />
            <span className="mt-2 text-xs font-semibold">Groceries</span>
          </Card>
          <Card className="flex flex-col items-center p-3">
            <VegetablesIllustration size={44} />
            <span className="mt-2 text-xs font-semibold">Vegetables</span>
          </Card>
          <Card className="flex flex-col items-center p-3">
            <RawChickenIllustration size={44} />
            <span className="mt-2 text-xs font-semibold">Raw Chicken</span>
          </Card>
          <Card className="flex flex-col items-center p-3">
            <LateNightIllustration size={44} />
            <span className="mt-2 text-xs font-semibold">Late Night</span>
          </Card>
        </div>
      </section>

      {/* Curfew & Offline Banners */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">Banners & Notifications</h2>
        <CurfewBanner
          gateName="Hostel 5 Gate"
          curfewTime="22:30"
          bufferMinutes={15}
          isNearingCurfew={true}
          onSwitchGate={() => showToast('Switch gate requested')}
        />
        <div className="flex gap-2">
          <Button onClick={() => showToast('Order placed successfully!', 'success')} size="sm">
            Show Success Toast
          </Button>
          <Button onClick={() => showToast('Vendor is currently busy', 'warning')} size="sm" variant="secondary">
            Show Warning Toast
          </Button>
          <Button onClick={() => setDialogOpen(true)} size="sm" variant="ghost">
            Open Modal Dialog
          </Button>
        </div>
      </section>

      {/* Skeletons & Empty States */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">Skeletons, Empty & Error States</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <VendorCardSkeleton />
          <EmptyState
            icon={<ShoppingBag className="h-6 w-6" />}
            title="Your bag is empty"
            description="Explore campus vendors and add dishes to your packet."
            actionLabel="Explore Canteens"
            onAction={() => showToast('Navigating to browse')}
          />
        </div>
      </section>

      {/* Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Confirm Vendor Switch"
        description="Your cart already contains items from Ganga Canteen. Adding items from another vendor will clear your current cart."
      >
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setDialogOpen(false)}>
            Keep Existing
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setDialogOpen(false);
              showToast('Cart cleared for new vendor');
            }}
          >
            Start New Cart
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
