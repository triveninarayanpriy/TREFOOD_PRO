import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export function OfflineBanner() {
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

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-xs font-semibold text-stone-950 shadow-sm"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>You are offline. Showing cached menus. Connect to place or track orders.</span>
      <button
        onClick={() => window.location.reload()}
        className="ml-2 inline-flex items-center gap-1 rounded bg-stone-900/10 px-2 py-0.5 text-xs hover:bg-stone-900/20"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
}
