import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this information. Check your campus connection and try again.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
      role="alert"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h3 className="text-base font-bold text-[var(--color-text)]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-[var(--color-text-muted)]">{message}</p>
      {onRetry && (
        <div className="mt-5">
          <Button onClick={onRetry} variant="secondary" size="sm">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
