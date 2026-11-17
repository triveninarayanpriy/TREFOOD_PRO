import { useState, lazy, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../../context/CartContext';
import { MobileTopBar } from './MobileTopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileCartSummary } from '../../components/v2/CartSummary/MobileCartSummary';
import type { Gate } from '@shared/schemas';

const CartDrawer = lazy(() =>
  import('../../components/cart/CartDrawer').then((m) => ({ default: m.CartDrawer }))
);
const GatePicker = lazy(() =>
  import('../../components/ui/GatePicker').then((m) => ({ default: m.GatePicker }))
);
const NotificationCentreDrawer = lazy(() =>
  import('../../components/notifications/NotificationCentre').then((m) => ({
    default: m.NotificationCentreDrawer,
  }))
);

export function MobileShell({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const { selectedGateId, setSelectedGateId, itemCount, items, vendor, quote } = useCart();
  const totalPaise =
    quote?.totalPaise ??
    items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);
  const vendorName = vendor?.name || 'Campus Counter';
  const [gatePickerOpen, setGatePickerOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const { data: gatesData } = useQuery<{ ok: boolean; gates: Gate[] }>({
    queryKey: ['gates'],
    queryFn: async () => {
      const res = await fetch('/api/gates');
      return res.json();
    },
  });
  const gates = gatesData?.gates || [];
  const currentGate = gates.find((g) => g.id === selectedGateId) || gates[0] || {
    id: 'gate_main',
    name: 'Main Gate',
    is24x7: true,
  };

  const isDedicatedConsole =
    location.pathname.startsWith('/v') ||
    location.pathname.startsWith('/vendor') ||
    location.pathname.startsWith('/admin');
  const isLandingRoute = location.pathname === '/';

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--color-canvas-paper)] text-[var(--color-ink)] flex flex-col font-sans pb-20">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-xl focus:bg-[#830020] focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
      >
        Skip to main content
      </a>

      {!isDedicatedConsole && (
        <MobileTopBar
          gateName={currentGate.name}
          is24x7={currentGate.is24x7}
          curfewTime={currentGate.curfewTime}
          onOpenGatePicker={() => setGatePickerOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
        />
      )}

      <main
        id="main-content"
        tabIndex={-1}
        className={`flex-1 w-full ${isLandingRoute ? 'max-w-none px-0 py-0' : 'max-w-md mx-auto px-4 py-4'} focus:outline-none`}
      >
        {children || <Outlet />}
      </main>

      {!isDedicatedConsole && (
        <>
          <MobileCartSummary
            itemCount={itemCount}
            totalPaise={totalPaise}
            vendorName={vendorName}
            onOpenCart={() => setCartOpen(true)}
          />
          <MobileBottomNav />
        </>
      )}

      {/* Lazy Drawers */}
      <Suspense fallback={null}>
        {cartOpen && <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />}
        {gatePickerOpen && (
          <GatePicker
            open={gatePickerOpen}
            onClose={() => setGatePickerOpen(false)}
            gates={gates}
            selectedGateId={selectedGateId}
            onSelectGate={(gateOrId) => {
              const id = typeof gateOrId === 'string' ? gateOrId : gateOrId.id;
              setSelectedGateId(id);
              setGatePickerOpen(false);
            }}
          />
        )}
        {notificationsOpen && (
          <NotificationCentreDrawer
            open={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
          />
        )}
      </Suspense>
    </div>
  );
}

export default MobileShell;
