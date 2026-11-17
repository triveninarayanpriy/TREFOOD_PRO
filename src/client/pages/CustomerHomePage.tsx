import { lazy, Suspense } from 'react';
import { useViewport } from '../hooks/useViewport';
import { MobileCardSkeleton, DesktopCardSkeleton } from '../components/v2/Skeleton/Skeleton';

const MobileHomePage = lazy(() =>
  import('../shells/mobile/pages/MobileHomePage').then((m) => ({ default: m.MobileHomePage }))
);
const DesktopHomePage = lazy(() =>
  import('../shells/desktop/pages/DesktopHomePage').then((m) => ({ default: m.DesktopHomePage }))
);

/**
 * CustomerHomePage is a thin route adapter that renders either <DesktopHomePage>
 * or <MobileHomePage> based on the useViewport hook with server-safe UA default.
 * Code-split by shell so phones never download desktop-only code.
 */
export function CustomerHomePage() {
  const { isDesktop } = useViewport();

  return (
    <Suspense
      fallback={
        isDesktop ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-8">
            <DesktopCardSkeleton />
            <DesktopCardSkeleton />
            <DesktopCardSkeleton />
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <MobileCardSkeleton />
            <MobileCardSkeleton />
            <MobileCardSkeleton />
          </div>
        )
      }
    >
      {isDesktop ? <DesktopHomePage /> : <MobileHomePage />}
    </Suspense>
  );
}

export default CustomerHomePage;
