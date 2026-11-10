import { useState } from 'react';
import { RefreshCw, Search, Clock, IndianRupee, Check } from 'lucide-react';
import { Button } from '../ui/Button';

export interface VendorMenuItemRow {
  id: string;
  categoryId: string;
  name: string;
  nameHi?: string | null;
  pricePaise: number;
  packingChargePaise?: number;
  isVeg?: boolean;
  inStock: boolean;
}

export interface VendorMenuCategoryRow {
  id: string;
  name: string;
}

export interface VendorMenuTabProps {
  items: VendorMenuItemRow[];
  categories: VendorMenuCategoryRow[];
  loading: boolean;
  promisedPrepMinutes: number;
  onRefresh: () => void;
  onToggleStock: (itemId: string, inStock: boolean) => Promise<void>;
  onUpdatePrice: (itemId: string, pricePaise: number) => Promise<void>;
  onUpdateDefaultPrepTime: (prepMinutes: number) => Promise<void>;
}

export function VendorMenuTab({
  items,
  categories,
  loading,
  promisedPrepMinutes,
  onRefresh,
  onToggleStock,
  onUpdatePrice,
  onUpdateDefaultPrepTime,
}: VendorMenuTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [prepDraft, setPrepDraft] = useState<number>(promisedPrepMinutes);
  const [savingPrep, setSavingPrep] = useState(false);

  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategoryId === 'all' || item.categoryId === selectedCategoryId;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.nameHi ? item.nameHi.toLowerCase().includes(q) : false);
    return matchesCat && matchesSearch;
  });

  const handleSavePrep = async () => {
    const clamped = Math.max(5, Math.min(90, Math.round(prepDraft)));
    setSavingPrep(true);
    try {
      await onUpdateDefaultPrepTime(clamped);
    } finally {
      setSavingPrep(false);
    }
  };

  const handleSaveItemPrice = async (item: VendorMenuItemRow) => {
    const raw = priceDrafts[item.id] ?? String(Math.round(item.pricePaise / 100));
    const rupees = Number.parseFloat(raw);
    if (!Number.isFinite(rupees) || rupees < 1 || rupees > 5000) return;

    setSavingItemId(item.id);
    try {
      await onUpdatePrice(item.id, Math.round(rupees * 100));
      setPriceDrafts((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } finally {
      setSavingItemId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Default Kitchen Prep Time Editor */}
      <section
        aria-label="Default kitchen prep time"
        className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 dark:border-stone-800 dark:bg-stone-900"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-stone-900 dark:text-stone-100">
              <Clock className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
              <span>Default Promised Prep Time</span>
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Used for student gate curfew eligibility and live ETA calculations (5–90 mins).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="vendor-default-prep-input" className="sr-only">
              Default prep minutes
            </label>
            <button
              type="button"
              onClick={() => setPrepDraft((v) => Math.max(5, v - 5))}
              className="min-h-[56px] min-w-[56px] rounded-xl border border-stone-300 bg-stone-50 font-mono text-base font-extrabold text-stone-900 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              aria-label="Decrease default prep time by 5 minutes"
            >
              -5m
            </button>
            <input
              id="vendor-default-prep-input"
              type="number"
              min={5}
              max={90}
              value={prepDraft}
              onChange={(e) => setPrepDraft(Number(e.target.value) || 5)}
              className="min-h-[56px] w-20 rounded-xl border border-stone-300 bg-white px-2 text-center font-mono text-base font-extrabold text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            />
            <button
              type="button"
              onClick={() => setPrepDraft((v) => Math.min(90, v + 5))}
              className="min-h-[56px] min-w-[56px] rounded-xl border border-stone-300 bg-stone-50 font-mono text-base font-extrabold text-stone-900 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              aria-label="Increase default prep time by 5 minutes"
            >
              +5m
            </button>
            <Button
              type="button"
              variant="primary"
              loading={savingPrep}
              onClick={handleSavePrep}
              className="min-h-[56px] px-5 font-bold"
            >
              Save Prep Time
            </Button>
          </div>
        </div>
      </section>

      {/* 1-Tap Menu Stock & Price Editor */}
      <section
        aria-label="Menu stock and prices"
        className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6 dark:border-stone-800 dark:bg-stone-900 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900 dark:text-stone-100">
              1-Tap Menu Stock Management
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Search dishes, edit menu prices, and mark sold-out items instantly.
            </p>
          </div>
          <Button onClick={onRefresh} variant="secondary" size="sm" className="min-h-[56px] px-4">
            <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>

        {/* Search & Category Filter */}
        <div className="space-y-3">
          <div className="relative">
            <label htmlFor="vendor-menu-search" className="sr-only">
              Search menu items
            </label>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
              aria-hidden="true"
            />
            <input
              id="vendor-menu-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes by name..."
              className="min-h-[56px] w-full rounded-xl border border-stone-300 bg-stone-50 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-500 focus:border-[#830020] focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            />
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
              <button
                type="button"
                onClick={() => setSelectedCategoryId('all')}
                className={`min-h-[44px] rounded-xl px-3.5 text-xs font-bold border transition-colors ${
                  selectedCategoryId === 'all'
                    ? 'border-[#830020] bg-[#830020] text-white'
                    : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200'
                }`}
              >
                All ({items.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`min-h-[44px] rounded-xl px-3.5 text-xs font-bold border transition-colors ${
                    selectedCategoryId === cat.id
                      ? 'border-[#830020] bg-[#830020] text-white'
                      : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-10 text-center text-xs text-stone-500">Loading menu items...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-10 text-center text-xs text-stone-500">
            No matching dishes found for &quot;{searchQuery}&quot;.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {filteredItems.map((item) => {
              const currentPriceDisplay = (item.pricePaise / 100).toFixed(0);
              const draftVal = priceDrafts[item.id] ?? currentPriceDisplay;
              const priceChanged =
                priceDrafts[item.id] !== undefined &&
                Math.round(Number.parseFloat(draftVal || '0') * 100) !== item.pricePaise;

              return (
                <div
                  key={item.id}
                  data-menu-stock-item={item.name}
                  className="py-3.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-[180px] flex-1">
                    <div className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                      {item.name}
                    </div>
                    <div className="mt-0.5 text-xs font-mono text-stone-600 dark:text-stone-400">
                      Current price: ₹{(item.pricePaise / 100).toFixed(2)}
                    </div>
                  </div>

                  {/* Inline Price Editor (56px touch target) */}
                  <div className="flex items-center gap-1.5">
                    <label htmlFor={`price-input-${item.id}`} className="sr-only">
                      Price in rupees for {item.name}
                    </label>
                    <div className="relative flex items-center">
                      <IndianRupee
                        className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-stone-500"
                        aria-hidden="true"
                      />
                      <input
                        id={`price-input-${item.id}`}
                        type="number"
                        min={1}
                        max={5000}
                        step={1}
                        value={draftVal}
                        onChange={(e) =>
                          setPriceDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="min-h-[56px] w-24 rounded-xl border border-stone-300 bg-stone-50 pl-7 pr-2 font-mono text-sm font-bold text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                      />
                    </div>
                    {priceChanged && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={savingItemId === item.id}
                        onClick={() => handleSaveItemPrice(item)}
                        aria-label={`Save price for ${item.name}`}
                        className="min-h-[56px] px-3.5 font-bold"
                      >
                        <Check className="mr-1 h-4 w-4" aria-hidden="true" />
                        Save
                      </Button>
                    )}
                  </div>

                  {/* 56px 1-Tap Stock Toggle */}
                  <button
                    type="button"
                    aria-pressed={item.inStock}
                    onClick={() => onToggleStock(item.id, !item.inStock)}
                    className={`min-h-[56px] min-w-[132px] rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
                      item.inStock
                        ? 'bg-emerald-800 text-white hover:bg-emerald-900'
                        : 'bg-red-100 text-red-900 border border-red-300 hover:bg-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800'
                    }`}
                  >
                    {item.inStock ? 'In Stock' : 'Sold Out'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
