import { describe, it, expect } from 'vitest';
import seedData from '../../db/real-seed.json';
import {
  computeCategoryChips,
  sortCustomerVendors,
  partitionCustomerVendors,
} from '@shared/catalogFilters';
import type { VendorSummary } from '@shared/types';

const SAMPLE_VENDORS: VendorSummary[] = [
  {
    id: 'rest_wrapchik_nitp',
    slug: 'wrapchik-pizza',
    name: 'Wrapchik Pizza',
    category: 'meals',
    description: 'Pizza, Burgers, Wraps, Crispy Chicken, Waffles, Fries',
    licence: 'FSSAI: pending verification',
    prepMinutes: 20,
    minOrderPaise: 4900,
    startingPricePaise: 3500,
    minVegPricePaise: 3500,
    hasVegItems: true,
    isOpen: true,
    canDeliverToGate: true,
    etaMinutes: 25,
    ratingAvg: 4.8,
    ratingCount: 150,
    status: 'active',
  },
  {
    id: 'rest_csb_nitp',
    slug: 'chai-sutta-bar-csb',
    name: 'Chai Sutta Bar (CSB)',
    category: 'snacks',
    description: 'Chai, Coffee, Fast Food, Snacks, Burgers',
    licence: 'FSSAI: pending verification',
    prepMinutes: 8,
    minOrderPaise: 3900,
    startingPricePaise: 1500,
    minVegPricePaise: 1500,
    hasVegItems: true,
    isOpen: true,
    canDeliverToGate: true,
    etaMinutes: 16,
    ratingAvg: 4.5,
    ratingCount: 220,
    status: 'active',
  },
  {
    id: 'rest_crave_nitp',
    slug: 'crave',
    name: 'Crave',
    category: 'raw_chicken',
    description: 'Hyderabadi Biryani and chicken specialties',
    licence: 'FSSAI: pending verification',
    prepMinutes: 12,
    minOrderPaise: 9900,
    startingPricePaise: 5500,
    hasVegItems: false,
    isOpen: true,
    canDeliverToGate: true,
    etaMinutes: 22,
    ratingAvg: 4.4,
    ratingCount: 80,
    status: 'active',
  },
  {
    id: 'rest_vrindavan_bhog_nitp',
    slug: 'vrindavan-bhog',
    name: 'Vrindavan Bhog',
    category: 'meals',
    description: 'Pure Vegetarian North & South Indian Thali',
    licence: 'FSSAI: pending verification',
    prepMinutes: 20,
    minOrderPaise: 49900,
    startingPricePaise: 5500,
    minVegPricePaise: 5500,
    hasVegItems: true,
    isOpen: false,
    canDeliverToGate: false,
    etaMinutes: 30,
    ratingAvg: 4.9,
    ratingCount: 300,
    status: 'active',
  },
];

describe('Catalog Filtering & Zero-Result Prevention', () => {
  it('computes live category chip counts and disables zero-result categories', () => {
    const { categories, effectiveCategory } = computeCategoryChips(SAMPLE_VENDORS, {
      vegOnly: true,
      selectedCategory: 'raw_chicken',
    });

    const chickenChip = categories.find((c) => c.id === 'raw_chicken')!;
    const mealsChip = categories.find((c) => c.id === 'meals')!;
    const snacksChip = categories.find((c) => c.id === 'snacks')!;
    const fruitsChip = categories.find((c) => c.id === 'fruits')!;

    expect(chickenChip.count).toBe(0);
    expect(chickenChip.disabled).toBe(true);
    expect(mealsChip.count).toBe(2);
    expect(mealsChip.disabled).toBe(false);
    expect(snacksChip.count).toBe(1);
    expect(snacksChip.disabled).toBe(false);
    expect(fruitsChip.disabled).toBe(true);
    // Incompatible category falls back safely to 'all'
    expect(effectiveCategory).toBe('all');
  });

  it('sorts open vendors before closed ones and honors ETA, Rating, and Price sorts', () => {
    const byEta = sortCustomerVendors(SAMPLE_VENDORS, 'eta');
    expect(byEta.map((v) => v.id)).toEqual(['rest_csb_nitp', 'rest_crave_nitp', 'rest_wrapchik_nitp', 'rest_vrindavan_bhog_nitp']);

    // Even though Vrindavan Bhog has 4.9 rating, it stays sorted below open vendors
    const byRating = sortCustomerVendors(SAMPLE_VENDORS, 'rating');
    expect(byRating.map((v) => v.id)).toEqual(['rest_wrapchik_nitp', 'rest_csb_nitp', 'rest_crave_nitp', 'rest_vrindavan_bhog_nitp']);

    const byPrice = sortCustomerVendors(SAMPLE_VENDORS, 'price', false);
    expect(byPrice.map((v) => v.id)).toEqual(['rest_csb_nitp', 'rest_wrapchik_nitp', 'rest_crave_nitp', 'rest_vrindavan_bhog_nitp']);
  });

  it('partitions vendors cleanly into open and closed lists', () => {
    const { openVendors, closedVendors } = partitionCustomerVendors(SAMPLE_VENDORS);
    expect(openVendors.map((v) => v.id)).toEqual(['rest_wrapchik_nitp', 'rest_csb_nitp', 'rest_crave_nitp']);
    expect(closedVendors.map((v) => v.id)).toEqual(['rest_vrindavan_bhog_nitp']);
  });

  it('guarantees Egg Fried Rice and all egg items are isVeg: false and excluded by veg filter', () => {
    const eggRegex = /\b(egg|eggs|anda|omelet|omelette)\b/i;
    
    // Find Egg Fried Rice specifically
    const eggFriedRice = seedData.menuItems.find(
      (m: { id: string; name: string }) => m.name.toLowerCase() === 'egg fried rice'
    );
    expect(eggFriedRice).toBeDefined();
    expect(eggFriedRice?.isVeg).toBe(false);

    // Check all items containing egg in name or description
    const eggItems = seedData.menuItems.filter(
      (m: { name: string; description?: string }) =>
        eggRegex.test(m.name) || eggRegex.test(m.description || '')
    );
    expect(eggItems.length).toBeGreaterThan(0);
    for (const item of eggItems) {
      expect(item.isVeg, `Expected ${item.name} (${item.id}) to have isVeg: false`).toBe(false);
    }

    // Verify veg-only filter strictly hides every egg item
    const vegOnlyFiltered = seedData.menuItems.filter((m: { isVeg: boolean }) => m.isVeg);
    for (const vegItem of vegOnlyFiltered) {
      const text = `${vegItem.name} ${vegItem.description || ''}`;
      expect(eggRegex.test(text), `Veg filter contained egg dish: ${vegItem.name}`).toBe(false);
    }
  });
});
