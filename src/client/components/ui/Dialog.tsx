import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-md',
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    }
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className={`relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden ${maxWidth} rounded-2xl border border-stone-200 bg-white shadow-xl transition-all dark:border-stone-800 dark:bg-stone-900`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-stone-100 px-5 pt-5 pb-3 dark:border-stone-800">
          <div>
            <h2 id="dialog-title" className="text-lg font-bold text-stone-900 dark:text-stone-100">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{description}</p>
            )}
          </div>
          <IconButton
            icon={<X className="h-4 w-4" />}
            onClick={onClose}
            ariaLabel="Close modal"
            variant="ghost"
            size="sm"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-3">{children}</div>
      </div>
    </div>
  );
}
