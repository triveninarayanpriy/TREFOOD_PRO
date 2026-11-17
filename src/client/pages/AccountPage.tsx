import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/Button';
import { ListRow } from '../components/ui/ListRow';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/Toast';
import { useSeoHead } from '../components/seo/SeoHead';
import { useTranslation } from '../i18n';
import type { SupportedLanguage } from '../i18n';
import {
  Globe,
  Sun,
  Moon,
  LogOut,
  Trash2,
} from 'lucide-react';

export function AccountPage() {
  useSeoHead({
    title: 'Campus Account & Preferences | TreFood NIT Patna',
    description: 'Manage campus session profile, language preferences, theme, and privacy deletion.',
    path: '/account',
    noIndex: true,
  });
  const navigate = useNavigate();
  const { user, logout, deleteAccount } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { i18n } = useTranslation();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isDark = resolvedTheme === 'dark';

  const setLanguage = (nextLang: SupportedLanguage) => {
    i18n.changeLanguage(nextLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('trefood_lang', nextLang);
    }
    const labelMap: Record<SupportedLanguage, string> = {
      en: 'Language set to English',
      hinglish: 'Hinglish mode ON! Navigation aur order status ab Hinglish mein hain.',
      hi: 'भाषा बदलकर हिंदी कर दी गई है',
    };
    showToast(labelMap[nextLang], 'info');
  };

  const handleDeleteData = async () => {
    setIsDeleting(true);
    const success = await deleteAccount();
    setIsDeleting(false);
    if (success) {
      setDeleteModalOpen(false);
      showToast('Your account and personal data were deleted.', 'info');
      navigate('/');
    } else {
      showToast('Could not delete account.', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-4 space-y-6 pb-24">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          Account &amp; Settings
        </h1>
        <p className="text-xs text-[var(--color-text-muted)]">Preferences, privacy controls and campus profiles</p>
      </div>

      {/* User Status Card */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#830020]/10 text-[#830020] dark:bg-amber-400/10 dark:text-amber-400 font-bold text-lg">
            {user?.email?.charAt(0).toUpperCase() || 'G'}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-[var(--color-text)] truncate">
              {user ? user.name || user.email : 'Guest Student'}
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] truncate">
              {user ? user.email : 'Not signed in • Browse enabled'}
            </p>
            {user && (
              <span className="mt-1 inline-block rounded-full bg-[var(--color-surface-sunken)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)] capitalize">
                Role: {user.role}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* App Preferences */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden divide-y divide-[var(--color-border-subtle)]">
        <div className="p-4 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <Globe className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
            <div>
              <div className="text-sm font-semibold text-[var(--color-text)]">Language / Hinglish Toggle</div>
              <div className="text-xs text-[var(--color-text-muted)]">
                Switch core navigation and order status strings
              </div>
            </div>
          </div>
          <div role="group" aria-label="Choose app language" className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'en', label: 'English' },
                { id: 'hinglish', label: 'Hinglish' },
                { id: 'hi', label: 'हिन्दी' },
              ] as const
            ).map((opt) => {
              const active = i18n.language === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setLanguage(opt.id)}
                  className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFB400] ${
                    active
                      ? 'border-[#830020] bg-[#830020] text-white dark:border-[#FFB400] dark:bg-[#FFB400] dark:text-[#1C1917]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-text)] hover:border-[#830020]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <ListRow
          title="Appearance"
          subtitle={isDark ? 'Dark theme' : 'Light theme'}
          leftIcon={isDark ? <Moon className="h-4 w-4" aria-hidden="true" /> : <Sun className="h-4 w-4" aria-hidden="true" />}
          rightElement={
            <Button onClick={toggleTheme} variant="secondary" size="sm">
              {isDark ? 'Light' : 'Dark'}
            </Button>
          }
        />
      </div>

      {/* Privacy and Account Actions */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden divide-y divide-[var(--color-border-subtle)]">
        {!user && (
          <ListRow
            title="Sign In Options (/signin)"
            subtitle="Google campus chooser or Email OTP"
            onClick={() => navigate('/signin?returnTo=/account')}
            showChevron
          />
        )}
        <ListRow
          title="Saved Favourites"
          subtitle="Quickly view your pinned NIT Patna canteens"
          onClick={() => navigate('/favorites')}
          showChevron
        />
        <ListRow
          title="Terms & Privacy"
          subtitle="NIT Patna campus delivery guidelines"
          onClick={() => navigate('/terms')}
          showChevron
        />
        {user && (
          <ListRow
            title="Sign Out"
            subtitle="Clear current session cookie"
            leftIcon={<LogOut className="h-4 w-4" />}
            onClick={logout}
          />
        )}
        {user && (
          <ListRow
            title="Delete My Data"
            subtitle="Permanently erase account and identifiers"
            leftIcon={<Trash2 className="h-4 w-4 text-red-500" />}
            onClick={() => setDeleteModalOpen(true)}
            destructive
          />
        )}
      </div>

      {/* Delete Data Confirmation Dialog */}
      <Dialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Account & Data?"
        description="This will anonymize your email and user account, end all active sessions, and delete your personal records under campus privacy guidelines."
      >
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" loading={isDeleting} onClick={handleDeleteData}>
            Delete My Data
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
