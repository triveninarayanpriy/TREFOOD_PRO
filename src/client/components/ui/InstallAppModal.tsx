import { Share, PlusSquare, Smartphone, Monitor } from 'lucide-react';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { isIosDevice } from '../../utils/platform';

export interface InstallAppModalProps {
  open: boolean;
  onClose: () => void;
}

export function InstallAppModal({ open, onClose }: InstallAppModalProps) {
  const ios = isIosDevice();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Install TreFood App"
      description="Add TreFood NIT Patna to your home screen for one-tap gate status cards and offline menus."
    >
      <div className="space-y-4 pt-2 text-sm text-[var(--color-text)]">
        {ios ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-[#830020] dark:text-[#FFB400]">
              <Smartphone className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>iPhone & iPad (Safari)</span>
            </div>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs text-[var(--color-text-muted)]">
              <li className="leading-relaxed">
                Open this page in <strong className="text-[var(--color-text)]">Safari</strong> and tap{' '}
                <Share className="inline h-3.5 w-3.5 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />{' '}
                <strong className="text-[var(--color-text)]">Share</strong>.
              </li>
              <li className="leading-relaxed">
                Scroll down and select{' '}
                <PlusSquare className="inline h-3.5 w-3.5 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />{' '}
                <strong className="text-[var(--color-text)]">Add to Home Screen</strong>.
              </li>
              <li className="leading-relaxed">
                Launch TreFood from your home screen to enable gate arrival notifications on iOS.
              </li>
            </ol>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#830020] dark:text-[#FFB400]">
              <Monitor className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Android Chrome & Desktop</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Tap your browser menu and select <strong className="text-[var(--color-text)]">Install app</strong> or{' '}
              <strong className="text-[var(--color-text)]">Add to Home screen</strong>. Installed mode opens faster on campus WiFi with instant order tracking.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="primary" onClick={onClose} className="min-h-[44px]">
            Got it
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
