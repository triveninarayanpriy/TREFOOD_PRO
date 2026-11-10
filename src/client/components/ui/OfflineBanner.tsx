import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export function OfflineBanner({ forceVisible = false }: { forceVisible?: boolean }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !forceVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-center gap-2 bg-[#FFB400] px-4 py-1.5 text-xs font-bold text-[#1C1917] shadow-xs"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>You are offline. Showing cached menus. Connect to place or track orders.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="ml-2 inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-[#1C1917]/10 px-3 text-xs font-bold text-[#1C1917] hover:bg-[#1C1917]/20 focus:outline-none focus:ring-2 focus:ring-[#830020]"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}
