import { useMemo } from 'react';
import { Clock, MapPin, ArrowRight } from 'lucide-react';
import type { Gate } from '@shared/schemas';
import { getGateCurfewStatus } from '@shared/curfew';

export interface GateBoardProps {
  gates: Gate[];
  selectedGateId?: string;
  onSelectGate?: (gate: Gate) => void;
  nowUtcSeconds?: number;
  compact?: boolean;
  className?: string;
}

/**
 * Signature Component #1: GateBoard
 * Railway departure-board style strip displaying real campus gates with live status dots
 * and IST curfew countdowns. Zero emojis, crisp hairline borders, warm paper/ink contrast.
 */
export function GateBoard({
  gates,
  selectedGateId,
  onSelectGate,
  nowUtcSeconds,
  compact = false,
  className = '',
}: GateBoardProps) {
  const rows = useMemo(
    () =>
      gates.map((gate) => ({
        gate,
        status: getGateCurfewStatus(gate, nowUtcSeconds),
      })),
    [gates, nowUtcSeconds]
  );

  if (rows.length === 0) return null;

  return (
    <section
      aria-label="Campus gate departure board"
      className={`border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl overflow-hidden shadow-[var(--shadow-card)] ${className}`}
    >
      {/* Departure board header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-text)] px-4 py-2.5 text-[var(--color-surface)]">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
          <MapPin className="h-3.5 w-3.5 text-[#FFB400]" strokeWidth={1.75} aria-hidden="true" />
          <span>NIT Patna Gate Board</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] opacity-85">
          <Clock className="h-3 w-3 text-[#FFB400]" strokeWidth={1.75} aria-hidden="true" />
          <span>IST LIVE</span>
        </div>
      </div>

      {/* Departure rows */}
      <div className={compact ? 'divide-y divide-[var(--color-border-subtle)]' : 'grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--color-border)]'}>
        {rows.map(({ gate, status }) => {
          const isSelected = selectedGateId === gate.id;
          const isClosed = !status.isOpen;
          const isClosingSoon = !isClosed && !status.is24x7 && (status.minutesRemaining ?? 999) <= 45;

          const dotColor = isClosed
            ? 'bg-[#B91C1C]'
            : isClosingSoon
            ? 'bg-[#B5651D]'
            : 'bg-[#15803D]';

          const statusLine = status.is24x7
            ? 'Open 24x7'
            : isClosed
            ? `Closed • Curfew ${gate.curfewTime}`
            : status.countdownText
            ? `${status.countdownText} (${gate.curfewTime})`
            : `Open until ${gate.curfewTime}`;

          const Wrapper = onSelectGate ? 'button' : 'div';

          return (
            <Wrapper
              key={gate.id}
              {...(onSelectGate
                ? {
                    type: 'button' as const,
                    onClick: () => onSelectGate(gate),
                    'aria-pressed': isSelected,
                  }
                : {})}
              className={`group flex w-full min-h-[56px] items-center justify-between gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FFB400] ${
                isSelected
                  ? 'bg-[#FFF6E5] dark:bg-[#2B1F16]'
                  : onSelectGate
                  ? 'hover:bg-[var(--color-surface-sunken)]'
                  : ''
              }`}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`}
                  />
                  <span className="truncate font-display text-sm font-bold text-[var(--color-text)]">
                    {gate.name}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-4.5 font-mono text-xs text-[var(--color-text-muted)]">
                  <span>{statusLine}</span>
                  <span aria-hidden="true">·</span>
                  <span>~{gate.travelMinutes} min walk</span>
                </div>
              </div>

              {onSelectGate && (
                <div className="shrink-0">
                  {isSelected ? (
                    <span className="inline-flex items-center rounded-md bg-[#830020] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white dark:bg-[#FFB400] dark:text-[#1C1210]">
                      Active
                    </span>
                  ) : (
                    <ArrowRight
                      className="h-4 w-4 text-[var(--color-text-subtle)] transition-transform group-hover:translate-x-0.5"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  )}
                </div>
              )}
            </Wrapper>
          );
        })}
      </div>
    </section>
  );
}
