import { Compass, Heart, Receipt, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../../i18n';

export function MobileBottomNav() {
  const { t } = useTranslation();

  const links = [
    { to: '/app', label: t('nav.browse', 'Menus Dekho'), icon: Compass },
    { to: '/favorites', label: t('nav.favorites', 'Saved'), icon: Heart },
    { to: '/orders', label: t('nav.orders', 'Mere Orders'), icon: Receipt },
    { to: '/account', label: t('nav.account', 'Account'), icon: User },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md px-2"
    >
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors ${
                isActive
                  ? 'text-[#830020] dark:text-[#FFB400]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{link.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
