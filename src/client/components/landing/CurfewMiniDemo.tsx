import { useState, useMemo } from 'react';
import {
  evaluateCanDeliver,
  isNightSafetyActive,
  parseHHMM,
  IST_OFFSET_SECONDS,
  type GateTimingInfo,
  type VendorTimingInfo,
} from '@shared/curfew';
import { Clock, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export interface CurfewMiniDemoProps {
  gates: GateTimingInfo[];
}

const SAMPLE_DEMO_VENDOR: VendorTimingInfo = {
  id: 'v_ganga',
  name: 'Ganga Hostel Canteen',
  hoursJson: JSON.stringify({ open: '07:30', close: '23:30' }),
  prepMinutes: 15,
  prepMaxMinutes: 20,
  isOpen: true,
  busyUntil: null,
  status: 'active',
};

const TIME_PRESETS = [
  { label: '2:00 PM', value: '14:00' },
  { label: '7:05 PM', value: '19:05' },
  { label: '7:20 PM', value: '19:20' },
  { label: '9:45 PM', value: '21:45' },
];

const FALLBACK_GATES: GateTimingInfo[] = [
  {
    id: 'gate_main',
    name: 'Main Gate / Academic Blocks',
    curfewTime: '23:59',
    bufferMinutes: 15,
    travelMinutes: 6,
    active: true,
    is24x7: true,
  },
  {
    id: 'gate_h5',
    name: 'Boys Hostel Gate',
    curfewTime: '19:30',
    bufferMinutes: 15,
    travelMinutes: 8,
    active: true,
    is24x7: false,
  },
  {
    id: 'gate_h7',
    name: 'Girls Hostel Gate',
    curfewTime: '19:30',
    bufferMinutes: 15,
    travelMinutes: 10,
    active: true,
    is24x7: false,
  },
];

export function CurfewMiniDemo({ gates }: CurfewMiniDemoProps) {
  const effectiveGates = gates.length > 0 ? gates : FALLBACK_GATES;
  const [selectedGateId, setSelectedGateId] = useState<string>(
    effectiveGates.find((g) => !g.is24x7)?.id || effectiveGates[0]?.id || 'gate_h5'
  );
  const [simulatedTimeIst, setSimulatedTimeIst] = useState<string>('19:20');

  const selectedGate =
    effectiveGates.find((g) => g.id === selectedGateId) || effectiveGates[0] || FALLBACK_GATES[0];

  const evaluation = useMemo(() => {
    const minutesOfDay = parseHHMM(simulatedTimeIst);
    // Construct deterministic UTC timestamp corresponding to that IST minute of day on 2026-11-10
    const midnightIstUtc = Math.floor(Date.UTC(2026, 10, 10, 0, 0, 0) / 1000) - IST_OFFSET_SECONDS;
    const simulatedUtc = midnightIstUtc + minutesOfDay * 60;

    const result = evaluateCanDeliver(
      SAMPLE_DEMO_VENDOR,
      selectedGate,
      simulatedUtc,
      { vendorId: SAMPLE_DEMO_VENDOR.id, gateId: selectedGate.id, extraMinutes: 0 },
      effectiveGates
    );

    const nightSafeNow = isNightSafetyActive(simulatedUtc);
    return { result, nightSafeNow };
  }, [selectedGate, simulatedTimeIst, effectiveGates]);

  const { result, nightSafeNow } = evaluation;

  return (
    <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#830020] dark:text-[#FFB400]">
            Interactive Curfew & Night Safety Check
          </span>
          <h3 className="text-lg font-extrabold text-[var(--color-text)]">
            Try live NIT Patna curfew logic
          </h3>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            nightSafeNow
              ? 'bg-[#FEF3C7] text-[#78350F] dark:bg-[#331F04] dark:text-[#FDE68A]'
              : 'bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {nightSafeNow ? 'Night Safety Active (7 PM+ Owner Delivery)' : 'Daytime Standard Slot'}
        </span>
      </div>

      {/* Controls: Gate + Simulated Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="demo-gate-select"
            className="block text-xs font-bold text-[var(--color-text)]"
          >
            1. Choose Hostel or Campus Gate
          </label>
          <select
            id="demo-gate-select"
            value={selectedGate.id}
            onChange={(e) => setSelectedGateId(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 text-sm font-semibold text-[var(--color-text)] focus:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
          >
            {effectiveGates.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.is24x7 ? '24x7 Open' : `${g.curfewTime} IST curfew`})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="demo-time-input"
            className="block text-xs font-bold text-[var(--color-text)]"
          >
            2. Pick Campus Time (IST)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {TIME_PRESETS.map((preset) => {
              const active = simulatedTimeIst === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setSimulatedTimeIst(preset.value)}
                  className={`min-h-[44px] rounded-xl px-3 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFB400] ${
                    active
                      ? 'bg-[#830020] text-white'
                      : 'border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-text)] hover:border-[#830020]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
            <input
              id="demo-time-input"
              type="time"
              value={simulatedTimeIst}
              onChange={(e) => e.target.value && setSimulatedTimeIst(e.target.value)}
              aria-label="Custom IST time"
              className="min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-xs font-mono font-bold text-[var(--color-text)] focus:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            />
          </div>
        </div>
      </div>

      {/* Live Output Panel */}
      <div
        role="status"
        aria-live="polite"
        className={`rounded-2xl border p-4 transition-colors ${
          result.ok
            ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100'
            : 'border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            {result.ok ? (
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400"
                aria-hidden="true"
              />
            ) : (
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400"
                aria-hidden="true"
              />
            )}
            <div className="space-y-1 text-sm">
              <div className="font-extrabold">
                {result.ok
                  ? `Orderable to ${selectedGate.name}`
                  : `Refused for ${selectedGate.name} (${result.reason || 'curfew'})`}
              </div>
              <p className="text-xs opacity-90 leading-relaxed">
                {result.ok
                  ? `${SAMPLE_DEMO_VENDOR.name} (${SAMPLE_DEMO_VENDOR.prepMinutes}m prep + ${selectedGate.travelMinutes}m gate walk) arrives around ${result.estimatedArrivalIst} IST with a ${selectedGate.bufferMinutes}m safety buffer.`
                  : result.message}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono font-semibold">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Arrival: {result.estimatedArrivalIst || '--:--'} IST
                </span>
                {!selectedGate.is24x7 && result.latestOrderTime && (
                  <span>Latest safe order: {result.latestOrderTime} IST</span>
                )}
              </div>
            </div>
          </div>

          {!result.ok && result.suggestedGate && (
            <button
              type="button"
              onClick={() => setSelectedGateId(result.suggestedGate!.gateId)}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-[#830020] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#6a001a] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              <span>Switch to {result.suggestedGate.gateName.split('/')[0].trim()}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
