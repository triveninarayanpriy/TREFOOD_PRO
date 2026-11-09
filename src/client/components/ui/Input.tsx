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

  return (
    <div className="w-full text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3.5 flex items-center text-stone-400">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full min-h-[44px] rounded-xl border py-2 text-sm text-stone-900 transition-colors focus:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#F2A900] disabled:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 ${
            leftIcon ? 'pl-10 pr-3.5' : 'px-3.5'
          } ${error ? 'border-red-500 focus:ring-red-400' : 'border-stone-200'} ${className}`}
          {...props}
        />
      </div>
      {hint && !error && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
