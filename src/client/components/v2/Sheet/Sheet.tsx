import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export interface SheetV2Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SheetV2({
  open,
  onClose,
  title,
  description,
  children,
  className = '',
}: SheetV2Props) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* 250ms Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-stone-950/50 backdrop-blur-[2px] transition-opacity duration-250 ease-out"
        aria-hidden="true"
      />

      {/* Slide-Up Bottom Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Bottom sheet'}
        className={`relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-t-[24px] border-t border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--elevation-4)] animate-in slide-in-from-bottom duration-250 ease-out ${className}`}
      >
        {/* Drag handle pill */}
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-stone-300 dark:bg-stone-700" />

        {(title || description) && (
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-3">
            <div>
              {title && (
                <h3 className="font-display text-[20px] font-bold text-[var(--color-text)]">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sheet"
              className="flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="pb-6">{children}</div>
      </div>
    </div>
  );
}
