import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Utensils, Store, ArrowRight, CornerDownLeft } from 'lucide-react';
import { ResponsiveImage } from '../ui/ResponsiveImage';

interface SearchDishResult {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  name: string;
  description: string;
  pricePaise: number;
  imageUrl: string;
  isVeg: boolean;
}

interface SearchVendorResult {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  category: string;
  coverImageUrl?: string;
  ratingAvg: number;
  ratingCount: number;
  prepMinutes: number;
  isOpen: boolean;
}

interface SearchApiResponse {
  ok: boolean;
  vendors?: SearchVendorResult[];
  dishes?: SearchDishResult[];
}

export interface DesktopCommandSearchProps {
  open: boolean;
  onClose: () => void;
  selectedGateId?: string;
}

const POPULAR_TAGS = ['Biryani', 'Burger', 'Pizza', 'Dosa', 'Cold Coffee', 'Thali', 'Maggi'];

export function DesktopCommandSearch({ open, onClose, selectedGateId = 'gate_main' }: DesktopCommandSearchProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<SearchVendorResult[]>([]);
  const [dishes, setDishes] = useState<SearchDishResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Flatten searchable list for keyboard arrow navigation
  const flatItems = [
    ...vendors.map((v) => ({ type: 'vendor' as const, data: v })),
    ...dishes.map((d) => ({ type: 'dish' as const, data: d })),
  ];

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setVendors([]);
      setDishes([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) {
          onClose();
        } else {
          // Trigger open via parent state
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Live search fetch with debounce
  useEffect(() => {
    if (!query.trim()) {
      setVendors([]);
      setDishes([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}&gateId=${selectedGateId}`
        );
        if (res.ok) {
          const data: SearchApiResponse = await res.json();
          setVendors(data.vendors || []);
          setDishes(data.dishes || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query, selectedGateId]);

  const handleSelectIndex = useCallback(
    (index: number) => {
      const target = flatItems[index];
      if (!target) return;
      onClose();
      if (target.type === 'vendor') {
        navigate(`/vendor/${target.data.slug}`);
      } else {
        navigate(`/vendor/${target.data.vendorSlug}`);
      }
    },
    [flatItems, navigate, onClose]
  );

  // Arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (flatItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelectIndex(selectedIndex);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search campus counters and dishes"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-stone-950/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--elevation-4)] flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Command Search Header */}
        <div className="relative flex items-center border-b border-[var(--color-border)] px-4 py-3.5 bg-[var(--color-surface)]">
          <Search className="h-5 w-5 text-[var(--color-text-muted)] shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes, canteens, biryani, burgers, shakes..."
            className="flex-1 bg-transparent px-3.5 text-[16px] font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2 py-0.5 text-[13px] font-mono font-medium text-[var(--color-text-muted)]">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
          {loading && (
            <div className="py-12 text-center text-[14px] text-[var(--color-text-muted)] flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#830020] border-t-transparent" />
              <span>Searching campus kitchens...</span>
            </div>
          )}

          {!loading && !query && (
            <div className="p-4 space-y-3">
              <div className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Popular Campus Searches
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setQuery(tag)}
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3.5 py-1.5 text-[14px] font-medium text-[var(--color-text)] hover:border-[#830020] hover:bg-[var(--color-surface)] hover:text-[#830020] transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && query && flatItems.length === 0 && (
            <div className="py-12 text-center">
              <Utensils className="mx-auto h-8 w-8 text-[var(--color-text-muted)] opacity-50" />
              <p className="mt-2 text-[15px] font-bold text-[var(--color-text)]">
                No results for "{query}"
              </p>
              <p className="text-[13px] text-[var(--color-text-muted)] mt-1">
                Try searching for pizza, biryani, burger, momos, or tea.
              </p>
            </div>
          )}

          {/* Vendors Group */}
          {vendors.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[13px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
                <Store className="h-3.5 w-3.5" />
                <span>Campus Canteens ({vendors.length})</span>
              </div>
              {vendors.map((vendor, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={vendor.id}
                    type="button"
                    data-active={isSelected ? 'true' : 'false'}
                    onClick={() => handleSelectIndex(idx)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between p-3 rounded-[12px] text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#830020]/10 text-[#830020] dark:bg-[#FFB400]/15 dark:text-[#FFB400]'
                        : 'hover:bg-[var(--color-surface-sunken)] text-[var(--color-text)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-[10px] overflow-hidden bg-stone-200 shrink-0 border border-[var(--color-border)]">
                        <ResponsiveImage
                          src={vendor.coverImageUrl || `/images/vendors/${vendor.slug}.jpg`}
                          alt={vendor.name}
                          crop="4x3"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[15px] truncate">{vendor.name}</div>
                        <div className="text-[13px] text-[var(--color-text-muted)] truncate">
                          ★ {vendor.ratingAvg.toFixed(1)} • ~{vendor.prepMinutes}m prep •{' '}
                          {vendor.isOpen ? 'Open Now' : 'Closed'}
                        </div>
                      </div>
                    </div>
                    {isSelected && <ArrowRight className="h-4 w-4 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Dishes Group */}
          {dishes.length > 0 && (
            <div className="space-y-1 pt-2">
              <div className="px-3 py-1 text-[13px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
                <Utensils className="h-3.5 w-3.5" />
                <span>Dishes &amp; Snacks ({dishes.length})</span>
              </div>
              {dishes.map((dish, i) => {
                const itemIndex = vendors.length + i;
                const isSelected = selectedIndex === itemIndex;
                const rupeePrice = `₹${Math.round(dish.pricePaise / 100)}`;
                return (
                  <button
                    key={dish.id}
                    type="button"
                    data-active={isSelected ? 'true' : 'false'}
                    onClick={() => handleSelectIndex(itemIndex)}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                    className={`w-full flex items-center justify-between p-3 rounded-[12px] text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#830020]/10 text-[#830020] dark:bg-[#FFB400]/15 dark:text-[#FFB400]'
                        : 'hover:bg-[var(--color-surface-sunken)] text-[var(--color-text)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 rounded-[10px] overflow-hidden bg-stone-200 shrink-0 border border-[var(--color-border)]">
                        <ResponsiveImage
                          src={dish.imageUrl}
                          alt={dish.name}
                          crop="1x1"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            role="img"
                            aria-label={dish.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                            className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                              dish.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                            }`}
                          />
                          <span className="font-bold text-[15px] truncate">{dish.name}</span>
                        </div>
                        <div className="text-[13px] text-[var(--color-text-muted)] truncate">
                          {dish.vendorName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="font-extrabold text-[15px]">{rupeePrice}</span>
                      {isSelected && <CornerDownLeft className="h-4 w-4" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Command Footer */}
        <div className="border-t border-[var(--color-border)] px-4 py-2.5 bg-[var(--color-surface-sunken)] flex items-center justify-between text-[13px] text-[var(--color-text-muted)]">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[11px]">
                ↑↓
              </kbd>
              <span>to navigate</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[11px]">
                ↵
              </kbd>
              <span>to select</span>
            </span>
          </div>
          <span>Match 4-digit code at gate</span>
        </div>
      </div>
    </div>
  );
}

export default DesktopCommandSearch;
