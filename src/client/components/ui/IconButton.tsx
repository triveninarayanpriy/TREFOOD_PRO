import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  ariaLabel?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'vendor';
  variant?: 'default' | 'ghost' | 'secondary' | 'danger';
}

export function IconButton({
  label,
  ariaLabel,
  icon,
  size = 'md',
  variant = 'default',
  className = '',
  children,
  ...props
}: IconButtonProps) {
  const accessibleLabel = label || ariaLabel || 'Action';

  const sizeStyles = {
    sm: 'min-h-[40px] min-w-[40px] p-2',
    md: 'min-h-[44px] min-w-[44px] p-2.5', // 44px WCAG touch target
    vendor: 'min-h-[56px] min-w-[56px] p-3.5', // 56px vendor tablet standard
  }[size];

  const variantStyles = {
    default: 'text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)]',
    ghost: 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text)]',
    secondary:
      'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)]',
    danger: 'text-[#B91C1C] hover:bg-[#FEF2F2] dark:text-[#FCA5A5] dark:hover:bg-[#3B0D12]',
  }[variant];

  return (
    <button
      type="button"
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className={`inline-flex items-center justify-center rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFB400] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {icon || children}
    </button>
  );
}
