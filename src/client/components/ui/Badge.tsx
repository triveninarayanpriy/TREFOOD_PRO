import React from 'react';

export function Badge({
  children,
  variant = 'default',
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'brand';
  className?: string;
}) {
  const styles = {
    default: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    danger: 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
    brand: 'bg-[#830020]/10 text-[#830020] border border-[#830020]/20 dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-400/20',
  }[variant];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles} ${className}`}>
      {children}
    </span>
  );
}

export function Chip({
  label,
  selected = false,
  onClick,
  icon,
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#F2A900] active:scale-95 ${
        selected
          ? 'bg-[#830020] text-white shadow-sm dark:bg-amber-500 dark:text-stone-950'
          : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
