import { lazy, Suspense } from 'react';
import { useViewport } from '../hooks/useViewport';
import { MobileCardSkeleton, DesktopCardSkeleton } from '../components/v2/Skeleton/Skeleton';

const MobileVendorPage = lazy(() =>
  import('../shells/mobile/pages/MobileVendorPage').then((m) => ({ default: m.MobileVendorPage }))
);
const DesktopVendorPage = lazy(() =>
  import('../shells/desktop/pages/DesktopVendorPage').then((m) => ({ default: m.DesktopVendorPage }))
);

/**
 * VendorPage is a thin route adapter that delegates to <DesktopVendorPage>
 * or <MobileVendorPage> based on useViewport with server-safe UA default.
 * Code-split by shell so phones never download desktop-only code.
 */
export function VendorPage() {
  const { isDesktop } = useViewport();

  return (
    <Suspense
      fallback={
        isDesktop ? (
          <div className="space-y-6 py-8">
            <div className="aspect-[21/9] w-full rounded-[24px] bg-stone-200 dark:bg-stone-800 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DesktopCardSkeleton />
              <DesktopCardSkeleton />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="aspect-[16/9] w-full rounded-[16px] bg-stone-200 dark:bg-stone-800 animate-pulse" />
            <MobileCardSkeleton />
            <MobileCardSkeleton />
          </div>
        )
      }
    >
      {isDesktop ? <DesktopVendorPage /> : <MobileVendorPage />}
    </Suspense>
  );
}

export default VendorPage;
