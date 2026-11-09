import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface ListRowProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
  className?: string;
  destructive?: boolean;
}

export function ListRow({
  title,
  subtitle,
  leftIcon,
  rightElement,
  showChevron = false,
  onClick,
  className = '',
  destructive = false,
}: ListRowProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
        onClick
          ? 'hover:bg-stone-50 active:bg-stone-100 dark:hover:bg-stone-850 dark:active:bg-stone-800'
          : ''
      } ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {leftIcon && <div className="shrink-0 text-stone-500 dark:text-stone-400">{leftIcon}</div>}
        <div className="flex flex-col min-w-0">
          <span
            className={`text-sm font-semibold truncate ${
              destructive ? 'text-red-600 dark:text-red-400' : 'text-stone-900 dark:text-stone-100'
            }`}
          >
            {title}
          </span>
          {subtitle && (
            <span className="text-xs text-stone-500 truncate dark:text-stone-400">{subtitle}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {rightElement}
        {showChevron && <ChevronRight className="h-4 w-4 text-stone-400" />}
      </div>
    </Component>
  );
}
