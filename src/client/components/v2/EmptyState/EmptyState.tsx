import type { ReactNode } from 'react';
import { useViewport } from '../../../hooks/useViewport';

export interface EmptyStateV2Props {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyStateV2({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateV2Props) {
  const { isDesktop } = useViewport();

  return (
    <div
      className={`mx-auto flex flex-col items-center justify-center text-center ${
        isDesktop ? 'max-w-md py-16 px-6' : 'max-w-sm py-12 px-4'
      } ${className}`}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
          {icon}
        </div>
      )}
      <h3
        className={`font-display font-bold text-[var(--color-text)] ${
          isDesktop ? 'text-[24px]' : 'text-[20px]'
        }`}
      >
        {title}
      </h3>
      <p
        className={`mt-1.5 text-[var(--color-text-muted)] leading-relaxed ${
          isDesktop ? 'text-[15px]' : 'text-[13px]'
        }`}
      >
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={`mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#830020] px-6 font-bold text-white shadow-xs hover:bg-[#69001A] active:scale-98 transition-all ${
            isDesktop ? 'text-[15px]' : 'text-[14px]'
          }`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
