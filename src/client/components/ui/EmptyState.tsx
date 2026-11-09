import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
      role="region"
      aria-label={title}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-stone-500 dark:text-stone-400">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button onClick={onAction} variant="secondary" size="sm">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
