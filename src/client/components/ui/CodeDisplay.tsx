import { ShieldCheck } from 'lucide-react';

export interface CodeDisplayProps {
  code: string;
  label?: string;
  helperText?: string;
  highlight?: boolean;
}

export function CodeDisplay({
  code,
  label = '4-Digit Handover Code',
  helperText = 'Match this number written on your packet before tapping confirm at the gate.',
  highlight = true,
}: CodeDisplayProps) {
  const digits = code.slice(0, 4).padEnd(4, '•').split('');

  return (
    <div
      role="region"
      aria-label={`${label}: ${digits.join(' ')}`}
      className={`rounded-2xl border p-4 text-center space-y-2.5 ${
        highlight
          ? 'border-[#830020]/30 bg-[var(--color-surface)] dark:border-[#FFB400]/40'
          : 'border-[var(--color-border)] bg-[var(--color-surface-sunken)]'
      }`}
    >
      <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
        <ShieldCheck className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
        <span>{label}</span>
      </div>

      <div className="flex items-center justify-center gap-2.5">
        {digits.map((digit, idx) => (
          <span
            key={`${idx}-${digit}`}
            style={{ animationDelay: `${idx * 70}ms` }}
            className="tf-digit-flip h-16 w-12 items-center justify-center rounded-lg border-2 border-[#830020]/30 bg-white font-handwriting text-5xl font-bold leading-none text-[#830020] shadow-xs dark:border-[#FFB400]/40 dark:bg-[#140D0B] dark:text-[#FFB400]"
          >
            {digit}
          </span>
        ))}
      </div>

      {helperText && (
        <p className="text-xs text-[var(--color-text-muted)] max-w-xs mx-auto">{helperText}</p>
      )}
    </div>
  );
}
