import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export interface SheetProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Sheet({ isOpen, open, onClose, title, children, maxWidth = 'max-w-lg' }: SheetProps) {
  const show = open ?? isOpen ?? false;
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1C1210]/65 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Content Panel */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Modal Sheet'}
        className={`relative z-10 flex max-h-[92vh] h-[92vh] sm:h-auto w-full ${maxWidth} flex-col rounded-t-[28px] bg-white shadow-2xl sm:rounded-3xl dark:bg-stone-900 animate-in slide-in-from-bottom duration-250 ease-out`}
      >
        {/* Drag handle pill on mobile */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-stone-300 dark:bg-stone-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5 dark:border-stone-800">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
            {title || 'Information'}
          </h2>
          <IconButton
            label="Close sheet"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
