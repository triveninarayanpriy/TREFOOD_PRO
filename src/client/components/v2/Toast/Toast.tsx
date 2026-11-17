import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useViewport } from '../../../hooks/useViewport';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastV2Props {
  message: string;
  type?: ToastType;
  onDismiss?: () => void;
  className?: string;
}

export function ToastV2({
  message,
  type = 'info',
  onDismiss,
  className = '',
}: ToastV2Props) {
  const { isDesktop } = useViewport();

  const iconMap = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    error: <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />,
    info: <Info className="h-4 w-4 text-[#830020] dark:text-[#FFB400] shrink-0" />,
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed z-50 flex items-center justify-between gap-3 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--elevation-3)] text-[14px] font-semibold text-[var(--color-text)] transition-all duration-250 animate-in fade-in ${
        isDesktop
          ? 'bottom-6 right-6 max-w-sm'
          : 'bottom-24 left-4 right-4 mx-auto max-w-md'
      } ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {iconMap[type]}
        <span className="truncate">{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss toast"
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
