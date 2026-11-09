import { Home, Compass, Receipt, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function BottomNav() {
  const { t } = useTranslation();

  const links = [
    { to: '/', label: t('nav.home', 'Home'), icon: Home },
    { to: '/browse', label: t('nav.browse', 'Browse'), icon: Compass },
    { to: '/orders', label: t('nav.orders', 'Orders'), icon: Receipt },
    { to: '/account', label: t('nav.account', 'Account'), icon: User },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-white/95 pb-safe backdrop-blur-md sm:hidden dark:border-stone-800 dark:bg-stone-900/95"
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
                `flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#F2A900] ${
                  isActive
                    ? 'text-[#830020] dark:text-amber-400'
                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
