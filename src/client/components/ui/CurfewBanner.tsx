import { AlertTriangle, Clock } from 'lucide-react';

export interface CurfewBannerProps {
  gateName: string;
  curfewTime: string;
  bufferMinutes: number;
  isNearingCurfew?: boolean;
  isClosed?: boolean;
  onSwitchGate?: () => void;
}

export function CurfewBanner({
  gateName,
  curfewTime,
  bufferMinutes,
  isNearingCurfew = false,
  isClosed = false,
  onSwitchGate,
}: CurfewBannerProps) {
  if (!isNearingCurfew && !isClosed) return null;

  return (
    <div
      role="alert"
      className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium ${
        isClosed
          ? 'bg-red-50 text-red-900 border border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-800'
          : 'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800'
      }`}
    >
      <div className="flex items-center gap-2">
        {isClosed ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        ) : (
          <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        )}
        <span>
          {isClosed
            ? `${gateName} curfew is active (${curfewTime}). Ordering to this gate is closed.`
            : `${gateName} curfew approaches at ${curfewTime} (${bufferMinutes}m buffer). Order soon!`}
        </span>
      </div>
      {onSwitchGate && (
        <button
          type="button"
          onClick={onSwitchGate}
          className="shrink-0 underline font-semibold hover:opacity-80"
        >
          Change gate
        </button>
      )}
    </div>
  );
}
