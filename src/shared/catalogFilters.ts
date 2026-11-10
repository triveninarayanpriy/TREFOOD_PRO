import type { VendorSummary } from './types';

export interface CategoryFilterDef {
  id: string;
  label: string;
  count: number;
  disabled: boolean;
}

export type CustomerSortOption = 'eta' | 'rating' | 'price';

export const CUSTOMER_CATEGORY_DEFS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'all', label: 'All Canteens' },
  { id: 'meals', label: 'Meals' },
  { id: 'snacks', label: 'Snacks' },
  { id: 'fruits', label: 'Fruits' },
  { id: 'beverages', label: 'Juices & Shakes' },
  { id: 'groceries', label: 'Groceries' },
  { id: 'vegetables', label: 'Vegetables' },
  { id: 'raw_chicken', label: 'Fresh Chicken' },
  { id: 'late_night', label: 'Late Night' },
];

export function isVendorVegCompatible(vendor: VendorSummary): boolean {
  if (vendor.category === 'raw_chicken') return false;
  if (vendor.hasVegItems === false) return false;
  return true;
}

export function isVendorOpenAndReachable(vendor: VendorSummary): boolean {
  return Boolean(vendor.isOpen) && vendor.canDeliverToGate !== false;
}

export function getVendorStartingPricePaise(vendor: VendorSummary, vegOnly = false): number {
  if (vegOnly && typeof vendor.minVegPricePaise === 'number' && vendor.minVegPricePaise > 0) {
    return vendor.minVegPricePaise;
  }
  if (typeof vendor.startingPricePaise === 'number' && vendor.startingPricePaise > 0) {
    return vendor.startingPricePaise;
  }
  if ((vendor.minOrderPaise ?? 0) > 0) return vendor.minOrderPaise!;
  return 0;
}

export function matchesVendorQuery(vendor: VendorSummary, query: string): boolean {
  const clean = query.trim().toLowerCase();
  if (!clean) return true;
  return (
    vendor.name.toLowerCase().includes(clean) ||
    (vendor.description || '').toLowerCase().includes(clean) ||
    vendor.category.toLowerCase().replace('_', ' ').includes(clean) ||
    vendor.category.toLowerCase().includes(clean)
  );
}

/**
 * Computes category chips with live counts from active non-category filters (vegOnly, query).
 * Guarantees zero-result combinations are prevented:
 * - Chips whose count is 0 are marked disabled (except 'all' when matching exists).
 * - If the requested category would produce 0 results, resolves to 'all' safely.
 */
export function computeCategoryChips(
  vendors: VendorSummary[],
  options: {
    vegOnly: boolean;
    query?: string;
    selectedCategory: string;
    openOnly?: boolean;
  }
): {
  categories: CategoryFilterDef[];
  effectiveCategory: string;
  baseMatched: VendorSummary[];
} {
  const baseMatched = vendors.filter((v) => {
    if (options.vegOnly && !isVendorVegCompatible(v)) return false;
    if (options.openOnly && !isVendorOpenAndReachable(v)) return false;
    if (options.query && !matchesVendorQuery(v, options.query)) return false;
    return true;
  });

  const categories = CUSTOMER_CATEGORY_DEFS.map((def) => {
    const count =
      def.id === 'all'
        ? baseMatched.length
        : baseMatched.filter((v) => v.category === def.id).length;
    return {
      id: def.id,
      label: def.label,
      count,
      disabled: count === 0,
    };
  });

  const selectedEntry = categories.find((c) => c.id === options.selectedCategory);
  const effectiveCategory =
    options.selectedCategory !== 'all' &&
    selectedEntry &&
    selectedEntry.count > 0
      ? options.selectedCategory
      : 'all';

  return {
    categories,
    effectiveCategory,
    baseMatched,
  };
}

/**
 * Sorts vendors keeping open & gate-reachable vendors strictly ahead of closed/unreachable ones,
 * and applying the chosen secondary comparator (ETA, Rating, or Price) within each group.
 */
export function sortCustomerVendors(
  vendors: VendorSummary[],
  sortBy: CustomerSortOption,
  vegOnly = false
): VendorSummary[] {
  return [...vendors].sort((a, b) => {
    const aOpen = isVendorOpenAndReachable(a) ? 0 : 1;
    const bOpen = isVendorOpenAndReachable(b) ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;

    if (sortBy === 'rating') {
      if (b.ratingAvg !== a.ratingAvg) return b.ratingAvg - a.ratingAvg;
      return b.ratingCount - a.ratingCount;
    }

    if (sortBy === 'price') {
      const aPrice = getVendorStartingPricePaise(a, vegOnly) || Number.MAX_SAFE_INTEGER;
      const bPrice = getVendorStartingPricePaise(b, vegOnly) || Number.MAX_SAFE_INTEGER;
      if (aPrice !== bPrice) return aPrice - bPrice;
    }

    const aEta = a.etaMinutes ?? a.prepMinutes + 10;
    const bEta = b.etaMinutes ?? b.prepMinutes + 10;
    if (aEta !== bEta) return aEta - bEta;
    return b.ratingAvg - a.ratingAvg;
  });
}

export function partitionCustomerVendors(vendors: VendorSummary[]): {
  openVendors: VendorSummary[];
  closedVendors: VendorSummary[];
} {
  const openVendors: VendorSummary[] = [];
  const closedVendors: VendorSummary[] = [];
  for (const v of vendors) {
    if (isVendorOpenAndReachable(v)) {
      openVendors.push(v);
    } else {
      closedVendors.push(v);
    }
  }
  return { openVendors, closedVendors };
}
