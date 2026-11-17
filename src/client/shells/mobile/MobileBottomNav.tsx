import { Home, UtensilsCrossed, Receipt, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../../i18n';

export function MobileBottomNav() {
  const { t } = useTranslation();

  const links = [
    { to: '/app', label: t('nav.home', 'Home'), icon: Home },
    { to: '/app/search', label: t('nav.menus', 'Menus'), icon: UtensilsCrossed },
    { to: '/orders', label: t('nav.orders', 'Orders'), icon: Receipt },
    { to: '/account', label: t('nav.account', 'Account'), icon: User },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
    >
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex min-h-[44px] min-w-[64px] flex-col items-center justify-center gap-0.5 text-[11px] font-bold active:scale-95 transition-transform cursor-pointer select-none ${
                isActive
                  ? 'text-[#830020] dark:text-[#FFB400]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="leading-none">{link.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;
