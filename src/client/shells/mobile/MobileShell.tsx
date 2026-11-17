import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../../context/CartContext';
import { MobileTopBar } from './MobileTopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileCartSummary } from '../../components/v2/CartSummary/MobileCartSummary';
import { WifiOff } from 'lucide-react';
import type { Gate } from '@shared/schemas';

const CartDrawer = lazy(() =>
  import('../../components/cart/CartDrawer').then((m) => ({ default: m.CartDrawer }))
);
const GatePicker = lazy(() =>
  import('../../components/ui/GatePicker').then((m) => ({ default: m.GatePicker }))
);
const InstallAppModal = lazy(() =>
  import('../../components/ui/InstallAppModal').then((m) => ({ default: m.InstallAppModal }))
);

export function MobileShell({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedGateId, setSelectedGateId, itemCount, items, vendor, quote } = useCart();
  const totalPaise =
    quote?.totalPaise ??
    items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);
  const vendorName = vendor?.name || 'Campus Counter';
  const [gatePickerOpen, setGatePickerOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [installPromptOpen, setInstallPromptOpen] = useState(false);

  // Offline detection banner
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Native Install prompt triggered after 1st completed order
  useEffect(() => {
    try {
      const hasCompleted = localStorage.getItem('trefood_has_completed_order') === 'true';
      const dismissed = localStorage.getItem('trefood_install_prompt_dismissed') === 'true';
      if (hasCompleted && !dismissed) {
        const timer = setTimeout(() => setInstallPromptOpen(true), 2000);
        return () => clearTimeout(timer);
      }
    } catch {
      // LocalStorage fallback
    }
  }, [location.pathname]);

  // Swipe Back Gesture from Left Edge
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch.clientX < 45) {
      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current !== null && touchStartYRef.current !== null) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartXRef.current;
      const deltaY = Math.abs(touch.clientY - touchStartYRef.current);
      if (
        deltaX > 75 &&
        deltaY < 50 &&
        location.pathname !== '/app' &&
        location.pathname !== '/'
      ) {
        try {
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(10);
          }
        } catch {
          // ignore
        }
        navigate(-1);
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

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
    is24x7: true,
  };

  const isDedicatedConsole =
    location.pathname === '/v' ||
    location.pathname === '/vendor' ||
    location.pathname === '/vendor/login' ||
    location.pathname === '/admin' ||
    location.pathname === '/admin/login' ||
    location.pathname.startsWith('/admin/');
  const isLandingRoute = location.pathname === '/';
  const isVendorPage = location.pathname.startsWith('/vendor/') || location.pathname.startsWith('/app/vendor/');
  const isCheckoutPage = location.pathname === '/checkout';

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen overflow-x-clip bg-[var(--color-canvas-paper)] text-[var(--color-ink)] flex flex-col font-sans pb-16"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-xl focus:bg-[#830020] focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
      >
        Skip to main content
      </a>

      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-[#830020] text-white px-3 py-1.5 text-[12px] font-bold shadow-md">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Offline Mode • Showing saved packet and cached menus</span>
        </div>
      )}

      {/* Decluttered Top Bar: Only Gate Selector & Search Button */}
      {!isDedicatedConsole && !isVendorPage && !isCheckoutPage && (
        <MobileTopBar
          gateName={currentGate.name}
          is24x7={currentGate.is24x7}
          curfewTime={currentGate.curfewTime}
          onOpenGatePicker={() => setGatePickerOpen(true)}
        />
      )}

      <main
        id="main-content"
        tabIndex={-1}
        className={`flex-1 w-full ${isLandingRoute ? 'max-w-none px-0 py-0' : 'max-w-md mx-auto px-3.5 py-3'} focus:outline-none`}
      >
        {children || <Outlet />}
      </main>

      {!isDedicatedConsole && !isCheckoutPage && (
        <>
          {/* Floating Cart Pill above Tab Bar */}
          <MobileCartSummary
            itemCount={itemCount}
            totalPaise={totalPaise}
            vendorName={vendorName}
            onOpenCart={() => setCartOpen(true)}
          />
          {/* 56px Tall Bottom Tab Bar */}
          <MobileBottomNav />
        </>
      )}

      {/* Drawers & Modals */}
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
        {installPromptOpen && (
          <InstallAppModal
            open={installPromptOpen}
            onClose={() => {
              setInstallPromptOpen(false);
              try {
                localStorage.setItem('trefood_install_prompt_dismissed', 'true');
              } catch {
                // ignore
              }
            }}
          />
        )}
      </Suspense>
    </div>
  );
}

export default MobileShell;
