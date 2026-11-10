import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Search, Clock, X, ArrowRight, Store } from 'lucide-react';

const RECENT_SEARCHES_KEY = 'trefood_recent_searches';
const MAX_RECENT = 6;

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): string[] {
  const clean = query.trim();
  if (!clean || typeof window === 'undefined') return getRecentSearches();
  const next = [clean, ...getRecentSearches().filter((q) => q.toLowerCase() !== clean.toLowerCase())].slice(
    0,
    MAX_RECENT
  );
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  return next;
}

interface SuggestResponse {
  ok: boolean;
  vendors: Array<{
    id: string;
    slug: string;
    name: string;
    category: string;
    isOpen: boolean;
  }>;
  items: Array<{
    id: string;
    vendorId: string;
    vendorSlug: string;
    vendorName: string;
    name: string;
    pricePaise: number;
    isVeg: boolean;
    inStock: boolean;
  }>;
}

export interface AppSearchBarProps {
  initialQuery?: string;
  gateId?: string;
  vegOnly?: boolean;
  placeholder?: string;
  onQuerySubmit?: (query: string) => void;
}

export function AppSearchBar({
  initialQuery = '',
  gateId,
  vegOnly = false,
  placeholder = 'Search campus canteens, paneer butter masala, fruits, chai...',
  onQuerySubmit,
}: AppSearchBarProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());

  useEffect(() => {
    setQuery(initialQuery);
    setDebouncedQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const { data: suggestData, isFetching: suggestLoading } = useQuery<SuggestResponse>({
    queryKey: ['search-suggest', debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error('Search suggestion failed');
      return res.json();
    },
    enabled: dropdownOpen && debouncedQuery.length >= 2,
    staleTime: 15000,
  });

  const navigateToSearch = (rawTerm: string) => {
    const clean = rawTerm.trim();
    setDropdownOpen(false);
    if (clean) {
      setRecentSearches(saveRecentSearch(clean));
    }
    if (onQuerySubmit) {
      onQuerySubmit(clean);
      return;
    }
    const params = new URLSearchParams();
    if (clean) params.set('q', clean);
    if (gateId) params.set('gate', gateId);
    if (vegOnly) params.set('veg', 'true');
    navigate(`/app/search?${params.toString()}`);
  };

  const handleRemoveRecent = (term: string) => {
    const next = recentSearches.filter((q) => q !== term);
    setRecentSearches(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateToSearch(query);
  };

  const popularFallbackQueries = ['Paneer', 'Chai', 'Biryani', 'Maggi', 'Fruits', 'Chicken'];
  const suggestedVendors = suggestData?.vendors || [];
  const suggestedItems = suggestData?.items || [];

  return (
    <div ref={containerRef} className="relative z-30">
      <form onSubmit={handleSubmit} role="search" aria-label="Search canteens and dishes" className="relative flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Input
            id="app-search-input"
            role="combobox"
            aria-autocomplete="list"
            aria-label="Search campus vendors and dishes"
            aria-expanded={dropdownOpen}
            aria-controls={dropdownOpen ? 'app-search-popover' : undefined}
            placeholder={placeholder}
            value={query}
            onFocus={() => setDropdownOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setDropdownOpen(true);
            }}
            leftIcon={<Search className="h-4 w-4" />}
            className="h-12 pr-10 text-sm shadow-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setDebouncedQuery('');
              }}
              aria-label="Clear search query"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#830020] px-4 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#6a001a] dark:bg-[#FFB400] dark:text-[#1C1917] dark:hover:bg-[#E5A200] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
        >
          <span>Search</span>
        </button>
      </form>

      {dropdownOpen && (
        <div
          id="app-search-popover"
          role="region"
          aria-label="Search suggestions and recent searches"
          className="absolute left-0 right-0 top-[54px] max-h-[70vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl space-y-4"
        >
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                <span>Recent Searches</span>
                <button
                  type="button"
                  onClick={() => {
                    setRecentSearches([]);
                    localStorage.removeItem(RECENT_SEARCHES_KEY);
                  }}
                  className="text-xs font-semibold normal-case text-[#830020] hover:underline dark:text-[#FFB400]"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <div
                    key={term}
                    className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] pl-3 pr-1 py-1 text-xs font-medium text-[var(--color-text)]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(term);
                        navigateToSearch(term);
                      }}
                      className="inline-flex items-center gap-1.5 min-h-[32px] pr-1.5 hover:text-[#830020] dark:hover:text-[#FFB400]"
                    >
                      <Clock className="h-3 w-3 text-[var(--color-text-muted)]" aria-hidden="true" />
                      <span>{term}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecent(term)}
                      aria-label={`Remove recent search ${term}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Suggestions (when typing 2+ chars) */}
          {debouncedQuery.length >= 2 ? (
            <div className="space-y-3">
              {suggestLoading ? (
                <div className="text-xs text-[var(--color-text-muted)] py-2">
                  Searching NIT Patna menus...
                </div>
              ) : suggestedVendors.length === 0 && suggestedItems.length === 0 ? (
                <div className="text-xs text-[var(--color-text-muted)] py-2">
                  No direct matches yet. Press Search to check full campus results.
                </div>
              ) : (
                <>
                  {suggestedVendors.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                        Campus Vendors
                      </div>
                      <div className="divide-y divide-[var(--color-border-subtle)] rounded-xl border border-[var(--color-border)] overflow-hidden">
                        {suggestedVendors.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setRecentSearches(saveRecentSearch(v.name));
                              setDropdownOpen(false);
                              navigate(`/vendor/${v.slug}`);
                            }}
                            className="flex w-full min-h-[44px] items-center justify-between gap-2 bg-[var(--color-surface)] px-3 py-2 text-left text-xs hover:bg-[var(--color-surface-sunken)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Store className="h-4 w-4 shrink-0 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
                              <span className="font-bold text-[var(--color-text)] truncate">{v.name}</span>
                            </div>
                            <Badge variant={v.isOpen ? 'success' : 'closed'}>
                              {v.isOpen ? 'Open' : 'Closed'}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {suggestedItems.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                        Dishes & Items
                      </div>
                      <div className="divide-y divide-[var(--color-border-subtle)] rounded-xl border border-[var(--color-border)] overflow-hidden">
                        {suggestedItems.map((it) => (
                          <button
                            key={it.id}
                            type="button"
                            onClick={() => {
                              setRecentSearches(saveRecentSearch(it.name));
                              setDropdownOpen(false);
                              navigate(`/vendor/${it.vendorSlug}`);
                            }}
                            className="flex w-full min-h-[44px] items-center justify-between gap-2 bg-[var(--color-surface)] px-3 py-2 text-left text-xs hover:bg-[var(--color-surface-sunken)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                                    it.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                                  }`}
                                />
                                <span className="font-bold text-[var(--color-text)] truncate">{it.name}</span>
                              </div>
                              <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                                from {it.vendorName}
                              </div>
                            </div>
                            <span className="font-mono font-bold text-[var(--color-text)] shrink-0">
                              ₹{(it.pricePaise / 100).toFixed(0)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={() => navigateToSearch(query)}
                className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--color-surface-sunken)] px-3 text-xs font-bold text-[#830020] hover:underline dark:text-[#FFB400]"
              >
                <span>See all results for &ldquo;{query.trim()}&rdquo;</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Popular Campus Searches
              </div>
              <div className="flex flex-wrap gap-2">
                {popularFallbackQueries.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setQuery(term);
                      navigateToSearch(term);
                    }}
                    className="inline-flex min-h-[36px] items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 text-xs font-semibold text-[var(--color-text)] hover:border-[#830020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB400]"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
