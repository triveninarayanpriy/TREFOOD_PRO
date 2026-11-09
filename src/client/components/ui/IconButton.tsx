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
    sm: 'min-h-[36px] min-w-[36px] p-1.5',
    md: 'min-h-[44px] min-w-[44px] p-2.5', // 44px standard
    vendor: 'min-h-[56px] min-w-[56px] p-3.5', // 56px vendor standard
  }[size];

  const variantStyles = {
    default: 'text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800',
    ghost: 'text-stone-500 hover:bg-stone-100/60 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800/60',
    secondary: 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300',
    danger: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40',
  }[variant];

  return (
    <button
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className={`inline-flex items-center justify-center rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#F2A900] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {icon || children}
    </button>
  );
}
