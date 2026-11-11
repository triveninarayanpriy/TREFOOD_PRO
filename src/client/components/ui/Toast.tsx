import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-20 sm:bottom-6 right-0 left-0 sm:left-auto sm:right-6 z-50 flex flex-col items-center sm:items-end gap-2 px-4"
        aria-live="polite"
        role="status"
      >
        {toasts.map((toast) => {
          const icons = {
            info: <Info className="h-4 w-4 text-blue-600 shrink-0" />,
            success: <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />,
            warning: <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />,
            error: <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />,
          }[toast.type];

          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-center justify-between gap-3 w-full sm:w-80 rounded-xl border border-stone-200 bg-white p-3.5 shadow-lg dark:border-stone-800 dark:bg-stone-900 animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {icons}
                <span className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
                  {toast.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="inline-flex min-h-[44px] min-w-[44px] -mr-2 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
                aria-label="Dismiss toast"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
