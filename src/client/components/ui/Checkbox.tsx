import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
  description?: string;
}

export function Checkbox({ label, description, checked, onChange, id, disabled, className = '', ...props }: CheckboxProps) {
  const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <label
      htmlFor={inputId}
      className={`inline-flex min-h-[44px] cursor-pointer items-start gap-3 py-1.5 select-none ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } ${className}`}
    >
      <div className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          id={inputId}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <div
          className={`h-5 w-5 rounded-md border transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-[#830020] peer-focus-visible:ring-offset-2 ${
            checked
              ? 'border-[#830020] bg-[#830020] text-white dark:border-amber-400 dark:bg-amber-400 dark:text-stone-950'
              : 'border-stone-300 bg-white hover:border-stone-400 dark:border-stone-700 dark:bg-stone-900'
          }`}
        >
          {checked && <Check className="h-4 w-4 stroke-[3]" />}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{label}</span>
        {description && <span className="text-xs text-stone-500 dark:text-stone-400">{description}</span>}
      </div>
    </label>
  );
}
