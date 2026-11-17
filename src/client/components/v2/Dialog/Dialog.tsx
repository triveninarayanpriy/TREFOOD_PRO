import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export interface DialogV2Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  maxWidth?: string;
  className?: string;
}

export function DialogV2({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  className = '',
}: DialogV2Props) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 250ms Soft Warm Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-stone-950/50 backdrop-blur-[2px] transition-opacity duration-250 ease-out"
        aria-hidden="true"
      />

      {/* Centered Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        className={`relative z-10 w-full ${maxWidth} overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--elevation-4)] p-6 transition-all duration-250 ease-out animate-in fade-in zoom-in-95 ${className}`}
      >
        {(title || description) && (
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
            <div>
              {title && (
                <h3 className="font-display text-[22px] font-bold text-[var(--color-text)]">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-[14px] text-[var(--color-text-muted)] mt-1">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
}
