import { useState, lazy, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../../context/CartContext';
import { DesktopTopNav } from './DesktopTopNav';
import { DesktopCartSummary } from '../../components/v2/CartSummary/DesktopCartSummary';
import type { Gate } from '@shared/schemas';

const CheckoutModal = lazy(() =>
  import('../../components/cart/CheckoutModal').then((m) => ({ default: m.CheckoutModal }))
);

export function DesktopShell({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const {
    selectedGateId,
    setSelectedGateId,
    itemCount,
    items,
    vendor,
    quote,
    updateQuantity,
  } = useCart();

  const subtotalPaise =
    quote?.subtotalPaise ??
    items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);
  const packingTotalPaise = quote?.packingTotalPaise ?? 0;
  const totalPaise = quote?.totalPaise ?? subtotalPaise + packingTotalPaise;
  const vendorName = vendor?.name || 'Campus Counter';

  const increaseItem = (lineKeyOrId: string) => {
    const item = items.find((i) => (i.lineKey || i.itemId) === lineKeyOrId);
    if (item) updateQuantity(lineKeyOrId, item.quantity + 1);
  };

  const decreaseItem = (lineKeyOrId: string) => {
    const item = items.find((i) => (i.lineKey || i.itemId) === lineKeyOrId);
    if (item) updateQuantity(lineKeyOrId, item.quantity - 1);
  };

  const [cartSlideOpen, setCartSlideOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

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
    name: 'Main Gate / Academic Blocks',
    curfewTime: '23:59',
    is24x7: true,
  };

  const isDedicatedConsole =
    location.pathname.startsWith('/v') ||
    location.pathname.startsWith('/vendor') ||
    location.pathname.startsWith('/admin');
  const isLandingRoute = location.pathname === '/';

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--color-canvas-paper)] text-[var(--color-ink)] flex flex-col font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-xl focus:bg-[#830020] focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
      >
        Skip to main content
      </a>

      {!isDedicatedConsole && (
        <DesktopTopNav
          selectedGateId={selectedGateId}
          gates={gates}
          onSelectGate={setSelectedGateId}
          cartItemCount={itemCount}
          cartTotalPaise={totalPaise}
          onOpenCart={() => setCartSlideOpen(true)}
        />
      )}

      {/* 1280px Max Content Container with 32px Gutters */}
      <main
        id="main-content"
        tabIndex={-1}
        className={`flex-1 w-full ${isLandingRoute ? 'max-w-none px-0 py-0' : 'tf-desktop-container py-8'} focus:outline-none`}
      >
        {children || <Outlet />}
      </main>

      {/* Slide-over Right Cart Panel (250ms ease-out) */}
      {!isDedicatedConsole && (
        <DesktopCartSummary
          open={cartSlideOpen}
          onClose={() => setCartSlideOpen(false)}
          vendorName={vendorName || 'Campus Counter'}
          items={items}
          subtotalPaise={subtotalPaise}
          packingTotalPaise={packingTotalPaise}
          totalPaise={totalPaise}
          gateName={currentGate.name}
          gateCurfewLabel={currentGate.is24x7 ? 'Open 24x7' : `${currentGate.curfewTime} IST`}
          onIncrease={increaseItem}
          onDecrease={decreaseItem}
          onCheckout={() => {
            setCartSlideOpen(false);
            setCheckoutModalOpen(true);
          }}
        />
      )}

      {/* Lazy Checkout Modal */}
      <Suspense fallback={null}>
        {checkoutModalOpen && (
          <CheckoutModal
            open={checkoutModalOpen}
            onClose={() => setCheckoutModalOpen(false)}
          />
        )}
      </Suspense>
    </div>
  );
}

export default DesktopShell;
