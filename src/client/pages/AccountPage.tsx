import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { ListRow } from '../components/ui/ListRow';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/Toast';
import { useSeoHead } from '../components/seo/SeoHead';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  Sun,
  Moon,
  LogOut,
  Trash2,
  Sparkles,
} from 'lucide-react';

export function AccountPage() {
  useSeoHead({
    title: 'Campus Account & Preferences | TreFood NIT Patna',
    description: 'Manage campus session profile, language preferences, theme, and privacy deletion.',
    path: '/account',
    noIndex: true,
  });
  const navigate = useNavigate();
  const { user, loginAsDemo, logout, deleteAccount } = useAuth();
  const { showToast } = useToast();
  const { i18n } = useTranslation();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'hi' ? 'en' : 'hi';
    i18n.changeLanguage(nextLang);
    showToast(nextLang === 'hi' ? 'भाषा बदलकर हिंदी कर दी गई है' : 'Language set to English', 'info');
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
        <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Account & Settings
        </h1>
        <p className="text-xs text-stone-500">Preferences, privacy controls and campus profiles</p>
      </div>

      {/* User Status Card */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#830020]/10 text-[#830020] dark:bg-amber-400/10 dark:text-amber-400 font-bold text-lg">
            {user?.email?.charAt(0).toUpperCase() || 'G'}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
              {user ? user.name || user.email : 'Guest Student'}
            </h3>
            <p className="text-xs text-stone-500 truncate">
              {user ? user.email : 'Not signed in • Browse enabled'}
            </p>
            {user && (
              <span className="mt-1 inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300 capitalize">
                Role: {user.role}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* App Preferences */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden dark:border-stone-800 dark:bg-stone-900 divide-y divide-stone-100 dark:divide-stone-800">
        <ListRow
          title="Language / भाषा"
          subtitle={i18n.language === 'hi' ? 'हिंदी (Hindi)' : 'English'}
          leftIcon={<Globe className="h-4 w-4" />}
          rightElement={
            <Button onClick={toggleLanguage} variant="secondary" size="sm">
              {i18n.language === 'hi' ? 'English' : 'हिंदी'}
            </Button>
          }
        />
        <ListRow
          title="Appearance"
          subtitle={isDark ? 'Dark theme' : 'Light theme'}
          leftIcon={isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          rightElement={
            <Button onClick={toggleTheme} variant="secondary" size="sm">
              {isDark ? 'Light' : 'Dark'}
            </Button>
          }
        />
      </div>

      {/* Demo Switchers for Reviewers */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/30 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <span>Demo Account Switcher (Review Mode)</span>
        </div>
        <p className="text-xs text-stone-600 dark:text-stone-400">
          Switch roles instantly to test student ordering, vendor counter management, or campus administration.
        </p>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <Button
            onClick={async () => {
              const res = await loginAsDemo('student');
              if (res.ok) showToast('Logged in as Student', 'success');
            }}
            variant="secondary"
            size="sm"
            className="text-xs"
          >
            Student
          </Button>
          <Button
            onClick={async () => {
              const res = await loginAsDemo('vendor');
              if (res.ok) {
                showToast('Logged in as Ganga Canteen Vendor', 'success');
                navigate('/v');
              }
            }}
            variant="secondary"
            size="sm"
            className="text-xs"
          >
            Vendor (/v)
          </Button>
          <Button
            onClick={async () => {
              const res = await loginAsDemo('admin');
              if (res.ok) {
                showToast('Logged in as Admin', 'success');
                navigate('/admin');
              }
            }}
            variant="secondary"
            size="sm"
            className="text-xs"
          >
            Admin (/admin)
          </Button>
        </div>
      </div>

      {/* Privacy and Account Actions */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden dark:border-stone-800 dark:bg-stone-900 divide-y divide-stone-100 dark:divide-stone-800">
        {!user && (
          <ListRow
            title="Sign In Options (/signin)"
            subtitle="Google campus chooser, Email OTP fallback, or Demo roles"
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
          title="Design System & UI Kit"
          subtitle="Explore all components, tokens and states"
          onClick={() => navigate('/dev/ui')}
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
