import { Suspense, lazy, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { ToastProvider } from './components/ui/Toast';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { TopBar } from './components/ui/TopBar';
import { BottomNav } from './components/ui/BottomNav';
import { DesktopNavRail } from './components/ui/DesktopNavRail';
import { GatePicker } from './components/ui/GatePicker';
import { CartDrawer } from './components/cart/CartDrawer';
import { usePwaInstall } from './hooks/usePwaInstall';
import { LandingPage } from './pages/LandingPage';
import { Skeleton } from './components/ui/Skeleton';
import { EmptyState } from './components/ui/EmptyState';
import { AlertCircle } from 'lucide-react';
import type { Gate } from '@shared/schemas';

const SignInModal = lazy(() =>
  import('./components/auth/SignInModal').then((m) => ({ default: m.SignInModal }))
);
const InstallAppModal = lazy(() =>
  import('./components/ui/InstallAppModal').then((m) => ({ default: m.InstallAppModal }))
);

// Lazy-load secondary routes so first load stays lean (<145 KB gzip) for hostel WiFi
const BrowsePage = lazy(() =>
  import('./pages/BrowsePage').then((m) => ({ default: m.BrowsePage }))
);
const VendorPage = lazy(() =>
  import('./pages/VendorPage').then((m) => ({ default: m.VendorPage }))
);
const OrderDetailPage = lazy(() =>
  import('./pages/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage }))
);
const OrdersPage = lazy(() =>
  import('./pages/OrdersPage').then((m) => ({ default: m.OrdersPage }))
);
const AccountPage = lazy(() =>
  import('./pages/AccountPage').then((m) => ({ default: m.AccountPage }))
);
const VendorConsolePage = lazy(() =>
  import('./pages/vendor/VendorConsolePage').then((m) => ({ default: m.VendorConsolePage }))
);
const AdminConsolePage = lazy(() =>
  import('./pages/admin/AdminConsolePage').then((m) => ({ default: m.AdminConsolePage }))
);
const DevKitPage = lazy(() =>
  import('./pages/DevKitPage').then((m) => ({ default: m.DevKitPage }))
);
const AboutPage = lazy(() =>
  import('./pages/LegalPages').then((m) => ({ default: m.AboutPage }))
);
const TermsPage = lazy(() =>
  import('./pages/LegalPages').then((m) => ({ default: m.TermsPage }))
);
const PrivacyPage = lazy(() =>
  import('./pages/LegalPages').then((m) => ({ default: m.PrivacyPage }))
);
const RefundsPage = lazy(() =>
  import('./pages/LegalPages').then((m) => ({ default: m.RefundsPage }))
);

function AppShell() {
  const location = useLocation();
  const { selectedGateId, setSelectedGateId, itemCount } = useCart();
  const [gatePickerOpen, setGatePickerOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const { modalOpen: installModalOpen, setModalOpen: setInstallModalOpen, triggerInstall } =
    usePwaInstall();

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
  const isLandingRoute = location.pathname === '/';
  const isDedicatedConsole = isVendorRoute || isAdminRoute;
  const showLeftRail = !isDedicatedConsole && !isLandingRoute;

  return (
    <div className="min-h-screen overflow-x-clip flex flex-col bg-[var(--color-surface-sunken)] text-[var(--color-text)] transition-colors">
      <OfflineBanner />

      {/* TopBar on customer & design system routes */}
      {!isDedicatedConsole && (
        <TopBar
          currentGate={currentGate}
          onOpenGatePicker={() => setGatePickerOpen(true)}
          cartCount={itemCount}
          onOpenCart={() => setCartDrawerOpen(true)}
          showDesktopLinks={isLandingRoute}
          onInstallApp={triggerInstall}
          onOpenSignIn={() => setSignInOpen(true)}
        />
      )}

      {/* Workspace shell: Desktop Left Rail + Full-width Main Area */}
      <div className={`flex-1 ${showLeftRail ? 'mx-auto flex w-full max-w-7xl' : 'w-full'}`}>
        {showLeftRail && <DesktopNavRail />}

        <main className="min-w-0 flex-1 pb-20 md:pb-8">
          <Suspense
            fallback={
              <div className="mx-auto max-w-3xl px-4 py-12 space-y-4">
                <Skeleton className="h-8 w-44 rounded-lg" />
                <Skeleton className="h-44 w-full rounded-2xl" />
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
              <Route path="/about" element={<AboutPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/refunds" element={<RefundsPage />} />
              <Route path="/dev/ui" element={<DevKitPage />} />
              <Route path="/dev/kit" element={<DevKitPage />} />
              <Route path="/v" element={<VendorConsolePage />} />
              <Route path="/admin" element={<AdminConsolePage />} />
              <Route
                path="*"
                element={
                  <div className="mx-auto max-w-md px-4 py-20 text-center">
                    <EmptyState
                      icon={<AlertCircle className="h-8 w-8 text-[var(--color-text-muted)]" />}
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
      </div>

      {/* Bottom Navigation on mobile (< md) */}
      {!isDedicatedConsole && <BottomNav />}

      {/* Global Gate Picker Sheet */}
      <GatePicker
        open={gatePickerOpen}
        onClose={() => setGatePickerOpen(false)}
        currentGateId={selectedGateId}
        onSelectGate={(gate: Gate | string) => {
          const id = typeof gate === 'string' ? gate : gate.id;
          setSelectedGateId(id);
          setGatePickerOpen(false);
        }}
      />

      {/* Global Cart Drawer */}
      <CartDrawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />

      {/* Lazy Sign In & Install App Modals */}
      <Suspense fallback={null}>
        {signInOpen && <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />}
        {installModalOpen && (
          <InstallAppModal open={installModalOpen} onClose={() => setInstallModalOpen(false)} />
        )}
      </Suspense>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <AppShell />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
