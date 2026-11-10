import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useSeoHead } from '../components/seo/SeoHead';
import { VendorCard } from '../components/ui/VendorCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { VendorCardSkeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { Heart, LogIn } from 'lucide-react';
import type { VendorSummary } from '@shared/types';

export function FavoritesPage() {
  useSeoHead({
    title: 'Saved Favourites | TreFood NIT Patna',
    description: 'Quickly reorder from your favourite NIT Patna canteens, fruit stalls, and grocery shops.',
    path: '/favorites',
    noIndex: true,
  });

  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<{ ok: boolean; favorites: Array<{ id: string; vendor: VendorSummary }> }>({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/favorites');
      if (!res.ok) throw new Error('Could not load saved favourites');
      return res.json();
    },
    enabled: Boolean(user),
  });

  const removeMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      const res = await fetch(`/api/favorites/${vendorId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove favourite');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      showToast('Removed from saved favourites', 'info');
    },
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <EmptyState
          icon={<LogIn className="h-8 w-8 text-[#830020] dark:text-[#FFB400]" />}
          title="Sign in to view your favourites"
          description="Guests can browse everything freely. Sign in to save favourite campus canteens and quick-reorder lists."
          actionLabel="Sign in to Continue"
          onAction={() => navigate('/signin?returnTo=/favorites&reason=favorites')}
        />
      </div>
    );
  }

  const list = data?.favorites || [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 space-y-5 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
            Saved Favourites
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Your pinned NIT Patna canteens and campus stalls
          </p>
        </div>
        <Link to="/browse">
          <Button variant="secondary" size="sm">
            Browse All Shops
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <VendorCardSkeleton />
          <VendorCardSkeleton />
        </div>
      ) : error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-8 w-8 text-[var(--color-text-muted)]" />}
          title="No favourite canteens saved yet"
          description="Tap the heart icon on any vendor card or menu page to pin it here."
          actionLabel="Explore Campus Canteens"
          onAction={() => navigate('/browse')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((entry) => (
            <VendorCard
              key={entry.vendor.id}
              vendor={entry.vendor}
              variant={entry.vendor.isOpen ? 'open' : 'closed'}
              isFavorite
              onToggleFavorite={() => removeMutation.mutate(entry.vendor.id)}
              onClick={() => navigate(`/vendor/${entry.vendor.slug}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
