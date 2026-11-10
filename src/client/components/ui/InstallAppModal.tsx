import { Dialog } from './Dialog';
import { Button } from './Button';
import { Download, Share, PlusSquare, Smartphone } from 'lucide-react';

export interface InstallAppModalProps {
  open: boolean;
  onClose: () => void;
}

export function InstallAppModal({ open, onClose }: InstallAppModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Install TreFood App"
      description="Add TreFood to your home screen for 1-tap hostel gate tracking and offline menu caching."
    >
      <div className="space-y-4 text-sm text-[var(--color-text)]">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4 space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-[#830020] dark:text-[#FFB400]">
            <Share className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>iPhone / iPad (Safari)</span>
          </div>
          <ol className="list-decimal pl-5 space-y-1.5 text-xs text-[var(--color-text-muted)] leading-relaxed">
            <li>
              Tap the <strong className="text-[var(--color-text)]">Share</strong> icon at the
              bottom of Safari.
            </li>
            <li>
              Scroll down and choose{' '}
              <strong className="inline-flex items-center gap-1 text-[var(--color-text)]">
                <PlusSquare className="h-3.5 w-3.5 inline" aria-hidden="true" /> Add to Home Screen
              </strong>
              .
            </li>
            <li>Tap <strong className="text-[var(--color-text)]">Add</strong> in the top corner.</li>
          </ol>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-[var(--color-text)]">
            <Smartphone className="h-4 w-4 shrink-0 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
            <span>Android (Chrome / Edge)</span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            Open your browser menu (<strong className="text-[var(--color-text)]">⋮</strong>) and
            tap <strong className="text-[var(--color-text)]">Install app</strong> or{' '}
            <strong className="text-[var(--color-text)]">Add to Home screen</strong>.
          </p>
        </div>

        <Button type="button" className="w-full" onClick={onClose}>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Got It
        </Button>
      </div>
    </Dialog>
  );
}
