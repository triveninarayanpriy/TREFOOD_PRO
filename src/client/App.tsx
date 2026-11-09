import { Suspense, lazy, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { ToastProvider } from './components/ui/Toast';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { TopBar } from './components/ui/TopBar';
import { BottomNav } from './components/ui/BottomNav';
import { GatePicker } from './components/ui/GatePicker';
import { CartDrawer } from './components/cart/CartDrawer';
import { LandingPage } from './pages/LandingPage';
import { BrowsePage } from './pages/BrowsePage';
import { VendorPage } from './pages/VendorPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { OrdersPage } from './pages/OrdersPage';
import { AccountPage } from './pages/AccountPage';
import { DevKitPage } from './pages/DevKitPage';
import { Skeleton } from './components/ui/Skeleton';
import { EmptyState } from './components/ui/EmptyState';
import { AlertCircle } from 'lucide-react';
import type { Gate } from '@shared/schemas';

// Lazy-load vendor and admin consoles to ensure 0 admin/vendor code in student bundle!
const VendorConsolePage = lazy(() =>
  import('./pages/vendor/VendorConsolePage').then((m) => ({ default: m.VendorConsolePage }))
);
const AdminConsolePage = lazy(() =>
  import('./pages/admin/AdminConsolePage').then((m) => ({ default: m.AdminConsolePage }))
);

function AppShell() {
  const location = useLocation();
  const { selectedGateId, setSelectedGateId, itemCount } = useCart();
  const [gatePickerOpen, setGatePickerOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  // Fetch gates
  const { data: gatesData } = useQuery<{ ok: boolean; gates: Gate[] }>({
    queryKey: ['gates'],
    queryFn: async () => {
      const res = await fetch('/api/gates');
      return res.json();
    },
    staleTime: 60000,
  });

  const currentGate = gatesData?.gates?.find((g) => g.id === selectedGateId) || null;

  const isVendorRoute = location.pathname.startsWith('/v');
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isDedicatedConsole = isVendorRoute || isAdminRoute;

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
      <OfflineBanner />

      {/* TopBar on customer routes */}
      {!isDedicatedConsole && (
        <TopBar
          currentGate={currentGate}
          onOpenGatePicker={() => setGatePickerOpen(true)}
          cartCount={itemCount}
          onOpenCart={() => setCartDrawerOpen(true)}
        />
      )}

      {/* Main View Area */}
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="mx-auto max-w-md px-4 py-16 space-y-4">
              <Skeleton className="h-8 w-40 rounded-lg" />
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/vendor/:slug" element={<VendorPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/dev/kit" element={<DevKitPage />} />
            <Route path="/v" element={<VendorConsolePage />} />
            <Route path="/admin" element={<AdminConsolePage />} />
            <Route
              path="*"
              element={
                <div className="mx-auto max-w-md px-4 py-20 text-center">
                  <EmptyState
                    icon={<AlertCircle className="h-8 w-8 text-stone-400" />}
                    title="Page Not Found"
                    description="The campus page you requested does not exist or has been moved."
                    actionLabel="Return to Campus Home"
                    onAction={() => (window.location.href = '/')}
                  />
                </div>
              }
            />
          </Routes>
        </Suspense>
      </main>

      {/* Bottom Navigation for mobile users */}
      {!isDedicatedConsole && <BottomNav />}

      {/* Global Gate Picker Modal */}
      <GatePicker
        open={gatePickerOpen}
        onClose={() => setGatePickerOpen(false)}
        currentGateId={selectedGateId}
        onSelectGate={(gate: any) => {
          const id = typeof gate === 'string' ? gate : gate.id;
          setSelectedGateId(id);
          setGatePickerOpen(false);
        }}
      />

      {/* Global Cart Drawer */}
      <CartDrawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <AppShell />
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
