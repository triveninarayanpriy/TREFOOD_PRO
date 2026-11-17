import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './components/ui/Toast';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { SplashScreen } from './components/ui/SplashScreen';
import { usePwaInstall } from './hooks/usePwaInstall';
import { useViewport } from './hooks/useViewport';
import { Skeleton } from './components/ui/Skeleton';
import { EmptyState } from './components/ui/EmptyState';
import { AlertCircle } from 'lucide-react';

import { LandingPage } from './pages/LandingPage';

// Lazy-load Mobile & Desktop Shells for strict shell-level code splitting
const MobileShell = lazy(() =>
  import('./shells/mobile/MobileShell').then((m) => ({ default: m.MobileShell }))
);
const DesktopShell = lazy(() =>
  import('./shells/desktop/DesktopShell').then((m) => ({ default: m.DesktopShell }))
);

const InstallAppModal = lazy(() =>
  import('./components/ui/InstallAppModal').then((m) => ({ default: m.InstallAppModal }))
);

// Route components are thin and load their respective mobile/desktop views
const CustomerHomePage = lazy(() =>
  import('./pages/CustomerHomePage').then((m) => ({ default: m.CustomerHomePage }))
);
const SearchResultsPage = lazy(() =>
  import('./pages/SearchResultsPage').then((m) => ({ default: m.SearchResultsPage }))
);
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
const FavoritesPage = lazy(() =>
  import('./pages/FavoritesPage').then((m) => ({ default: m.FavoritesPage }))
);
const SignInPage = lazy(() =>
  import('./pages/SignInPage').then((m) => ({ default: m.SignInPage }))
);
const AccountPage = lazy(() =>
  import('./pages/AccountPage').then((m) => ({ default: m.AccountPage }))
);
const CheckoutPage = lazy(() =>
  import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage }))
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

function AppRoutes() {
  return (
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
        <Route path="/app" element={<CustomerHomePage />} />
        <Route path="/app/search" element={<SearchResultsPage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/app/vendor/:slug" element={<VendorPage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/vendor/:slug" element={<VendorPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/refunds" element={<RefundsPage />} />
        {import.meta.env.DEV && (
          <>
            <Route path="/dev/ui" element={<DevKitPage />} />
            <Route path="/dev/kit" element={<DevKitPage />} />
          </>
        )}
        <Route path="/vendor/login" element={<VendorConsolePage />} />
        <Route path="/admin/login" element={<AdminConsolePage />} />
        <Route path="/v" element={<VendorConsolePage />} />
        <Route path="/vendor" element={<VendorConsolePage />} />
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
  );
}

function AppShell() {
  const { isDesktop } = useViewport();
  const { modalOpen: installModalOpen, setModalOpen: setInstallModalOpen } = usePwaInstall();

  return (
    <>
      <SplashScreen />
      <OfflineBanner />

      <Suspense
        fallback={
          <div className="min-h-screen bg-[var(--color-canvas-paper)] flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#830020] border-t-transparent" />
          </div>
        }
      >
        {isDesktop ? (
          <DesktopShell>
            <AppRoutes />
          </DesktopShell>
        ) : (
          <MobileShell>
            <AppRoutes />
          </MobileShell>
        )}
      </Suspense>

      {/* Lazy Install App Modal */}
      <Suspense fallback={null}>
        {installModalOpen && (
          <InstallAppModal open={installModalOpen} onClose={() => setInstallModalOpen(false)} />
        )}
      </Suspense>
    </>
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
