import { AlertCircle, RefreshCw, X } from 'lucide-react';

export interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({
  title,
  message,
  onRetry,
  onDismiss,
  className = '',
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs text-[#991B1B] dark:border-[#991B1B] dark:bg-[#3B0D12] dark:text-[#FCA5A5] ${className}`}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          {title && <div className="font-bold text-sm">{title}</div>}
          <p className="font-medium leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-bold text-[#991B1B] border border-[#FECACA] hover:bg-red-50 dark:bg-[#180B0F] dark:text-[#FCA5A5] dark:border-[#991B1B] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
