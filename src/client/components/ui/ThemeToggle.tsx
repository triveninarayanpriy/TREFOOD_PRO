import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export interface ThemeToggleProps {
  showSystemLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showSystemLabel = false, className = '' }: ThemeToggleProps) {
  const { resolvedTheme, preference, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Theme: ${preference} (${resolvedTheme}) — click to toggle`}
      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs font-semibold text-[var(--color-text)] shadow-xs transition-colors hover:bg-[var(--color-surface-raised)] focus:outline-none focus:ring-2 focus:ring-[#FFB400] ${className}`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4 text-[#FFB400]" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-[#830020]" aria-hidden="true" />
      )}
      {showSystemLabel && (
        <span className="hidden sm:inline capitalize">
          {preference === 'system' ? (
            <span className="inline-flex items-center gap-1">
              <Monitor className="h-3 w-3" aria-hidden="true" />
              {resolvedTheme}
            </span>
          ) : (
            resolvedTheme
          )}
        </span>
      )}
    </button>
  );
}
