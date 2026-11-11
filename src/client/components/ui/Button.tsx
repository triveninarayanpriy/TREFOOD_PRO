import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'amber' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'vendor';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#FFB400] focus:ring-offset-2 focus:ring-offset-[var(--color-surface)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'min-h-[44px] px-3.5 py-2 text-xs',
    md: 'min-h-[44px] px-4 py-2 text-sm', // 44px WCAG touch target standard
    lg: 'min-h-[48px] px-6 py-2.5 text-base',
    vendor: 'min-h-[56px] px-6 py-3 text-lg font-bold', // 56px vendor tablet standard
  }[size];

  const variantStyles = {
    primary: 'bg-[#830020] text-white hover:bg-[#69001A] shadow-xs',
    amber: 'bg-[#FFB400] text-[#1C1210] hover:bg-[#E5A100] shadow-xs font-bold',
    secondary:
      'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)]',
    ghost:
      'bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)]',
    danger: 'bg-[#B91C1C] text-white hover:bg-[#991B1B]',
  }[variant];

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
