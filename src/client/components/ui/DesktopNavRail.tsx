import {
  Home,
  Compass,
  Receipt,
  User,
  Palette,
  Store,
  ShieldAlert,
  ShieldCheck,
  Heart,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { isNightSafetyActive } from '@shared/curfew';

export function DesktopNavRail() {
  const { t } = useTranslation();
  const nightSafeNow = isNightSafetyActive();

  const primaryLinks = [
    { to: '/', label: t('nav.home', 'Home'), icon: Home },
    { to: '/app', label: t('nav.browse', 'Browse Canteens'), icon: Compass },
    { to: '/favorites', label: t('nav.favorites', 'Favourites'), icon: Heart },
    { to: '/orders', label: t('nav.orders', 'My Orders'), icon: Receipt },
    { to: '/account', label: t('nav.account', 'Account'), icon: User },
  ];

  const toolLinks = [
    { to: '/vendor', label: t('nav.vendor', 'Vendor Console'), icon: Store },
    { to: '/admin', label: t('nav.admin', 'Admin'), icon: ShieldAlert },
    { to: '/dev/ui', label: 'UI Kit (/dev/ui)', icon: Palette },
  ];

  return (
    <aside
      aria-label="Desktop Navigation Rail"
      className="hidden md:flex w-56 lg:w-60 shrink-0 flex-col justify-between border-r border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-5 min-h-[calc(100vh-65px)] sticky top-[65px] self-start"
    >
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Campus Delivery
          </div>
          {primaryLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFB400] ${
                    isActive
                      ? 'bg-[#830020] text-white shadow-xs dark:bg-[#FFB400] dark:text-[#1C1917]'
                      : 'text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)]'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>

        <div className="space-y-1 border-t border-[var(--color-border-subtle)] pt-4">
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Roles & System
          </div>
          {toolLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFB400] ${
                    isActive
                      ? 'bg-[#830020]/10 text-[#830020] dark:bg-[#FFB400]/15 dark:text-[#FFB400]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)]'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Campus Night Safety Status Box */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-3 text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-[#830020] dark:text-[#FFB400]">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Campus Night Safety</span>
        </div>
        <p className="text-[var(--color-text-muted)] leading-relaxed">
          {nightSafeNow
            ? 'Active now (7 PM+): owner or senior staff deliver personally.'
            : 'After 7 PM deliveries are handled by owner or senior staff.'}
        </p>
      </div>
    </aside>
  );
}
