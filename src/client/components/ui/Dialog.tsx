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
        className={`relative w-full ${maxWidth} rounded-2xl border border-stone-200 bg-white p-6 shadow-xl transition-all dark:border-stone-800 dark:bg-stone-900`}
      >
        <div className="flex items-start justify-between gap-4 pb-3">
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
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}
