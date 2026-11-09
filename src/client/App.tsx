import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import type { HealthResponse } from '@shared/types';

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health');
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

export function App() {
  const { data: health, isLoading, error, refetch } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  });

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#830020] text-amber-400 font-bold shadow-sm">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#830020]">TreFood</span>
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">
                NIT Patna
              </span>
            </div>
          </div>
          <div className="text-xs font-medium text-stone-500">
            Pay at Gate • 0 Delivery Fee
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Hyperlocal Campus Delivery
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Order food, fruits, groceries and raw chicken from campus vendors. Collect at hostel gates matching a 4-digit code.
          </p>

          <div className="mt-6 rounded-xl border border-stone-100 bg-stone-50 p-4 text-left">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Worker API Status
              </span>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1 text-xs font-medium text-stone-600 hover:text-stone-900"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </button>
            </div>

            <div className="mt-3 space-y-2 text-sm">
              {isLoading && (
                <div className="flex items-center gap-2 text-stone-600">
                  <RefreshCw className="h-4 w-4 animate-spin text-amber-600" />
                  Checking /api/health...
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  Health check failed: {(error as Error).message}
                </div>
              )}

              {health && (
                <>
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Backend Worker: {health.ok ? 'Online' : 'Offline'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-stone-600">
                    <span>Database (D1):</span>
                    <span className="font-mono font-semibold text-emerald-700">
                      {health.db ? 'Connected (SELECT 1 ok)' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-stone-600">
                    <span>Version:</span>
                    <span className="font-mono">{health.version}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-stone-200 bg-white py-4 text-center text-xs text-stone-500">
        TreFood Prototype • NIT Patna Campus Hyperlocal Delivery • Asia/Kolkata
      </footer>
    </div>
  );
}

export default App;
