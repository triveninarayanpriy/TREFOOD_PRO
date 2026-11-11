import { Home, Compass, Receipt, User, Heart } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../../i18n';

export function BottomNav() {
  const { t } = useTranslation();

  const links = [
    { to: '/', label: t('nav.home', 'Home'), icon: Home },
    { to: '/app', label: t('nav.browse', 'Browse'), icon: Compass },
    { to: '/favorites', label: t('nav.favorites', 'Saved'), icon: Heart },
    { to: '/orders', label: t('nav.orders', 'Orders'), icon: Receipt },
    { to: '/account', label: t('nav.account', 'Account'), icon: User },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-safe md:hidden"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex min-h-[44px] min-w-[60px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFB400] ${
                  isActive
                    ? 'text-[#830020] dark:text-[#FFB400]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
