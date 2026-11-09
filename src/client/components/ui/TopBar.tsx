import { ShoppingBag, MapPin, Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { Gate } from '@shared/schemas';

interface TopBarProps {
  currentGate: Gate | null;
  onOpenGatePicker: () => void;
  cartCount: number;
  onOpenCart: () => void;
}

export function TopBar({
  currentGate,
  onOpenGatePicker,
  cartCount,
  onOpenCart,
}: TopBarProps) {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('trefood_lang', nextLang);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/95">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#830020] text-amber-400 shadow-sm transition-transform group-hover:scale-105">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-display text-xl font-extrabold tracking-tight text-[#830020] dark:text-amber-400">
                TreFood
              </span>
              <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                NITP
              </span>
            </div>
            <span className="text-[10px] font-medium text-stone-500">₹0 Delivery Fee</span>
          </div>
        </Link>

        {/* Center: Gate Picker Trigger Pill */}
        <button
          type="button"
          onClick={onOpenGatePicker}
          className="flex min-h-[44px] max-w-[210px] items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs transition-colors hover:border-[#830020]/30 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-750"
          aria-label="Select hostel gate"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#830020] dark:text-amber-400" />
          <span className="truncate font-semibold text-stone-800 dark:text-stone-200">
            {currentGate ? currentGate.name.split('(')[0] : 'Choose Gate'}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-stone-400" />
        </button>

        {/* Right Actions: Language Switch & Cart */}
        <div className="flex items-center gap-1.5">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex min-h-[44px] items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            title="Switch Language (English / हिन्दी)"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{i18n.language === 'en' ? 'हिन्दी' : 'EN'}</span>
          </button>

          {/* Cart Button */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Open Cart with ${cartCount} items`}
            className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[#830020] text-white shadow-xs transition-transform hover:bg-[#6a001a] active:scale-95"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F2A900] font-mono text-xs font-bold text-stone-950 ring-2 ring-white dark:ring-stone-900">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
