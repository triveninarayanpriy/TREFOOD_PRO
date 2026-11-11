import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id || props.name || Math.random().toString(36).substring(2, 9);
  const hintId = hint && !error ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="w-full text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1 block text-xs font-semibold text-[var(--color-text)]"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3.5 flex items-center text-[var(--color-text-muted)]">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          aria-invalid={Boolean(error) || undefined}
          className={`w-full min-h-[44px] rounded-xl border bg-[var(--color-surface-sunken)] py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] transition-colors focus:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400] disabled:opacity-60 ${
            leftIcon ? 'pl-10 pr-3.5' : 'px-3.5'
          } ${error ? 'border-red-600 focus:ring-red-400' : 'border-[var(--color-border)]'} ${className}`}
          {...props}
        />
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-[var(--color-text-muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-700 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
