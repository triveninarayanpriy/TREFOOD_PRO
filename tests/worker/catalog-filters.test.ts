import { describe, it, expect } from 'vitest';
import {
  computeCategoryChips,
  sortCustomerVendors,
  partitionCustomerVendors,
} from '@shared/catalogFilters';
import type { VendorSummary } from '@shared/types';

const SAMPLE_VENDORS: VendorSummary[] = [
  {
    id: 'v_ganga',
    slug: 'ganga-dhaba',
    name: 'Ganga Dhaba',
    category: 'meals',
    description: 'North Indian curries and biryani',
    fssaiNo: '104210000001',
    prepMinutes: 15,
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
    id: 'v_chai',
    slug: 'campus-chai',
    name: 'Campus Chai Point',
    category: 'snacks',
    description: 'Tea, maggi and quick snacks',
    fssaiNo: '104210000002',
    prepMinutes: 8,
    minOrderPaise: 0,
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
    id: 'v_meat',
    slug: 'patna-fresh-meat',
    name: 'Patna Fresh Meat',
    category: 'raw_chicken',
    description: 'Fresh broiler chicken cuts & eggs',
    fssaiNo: '104210000003',
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
    id: 'v_mithila',
    slug: 'mithila-tiffin',
    name: 'Mithila Homestyle Tiffin',
    category: 'meals',
    description: 'Homestyle tiffin meals',
    fssaiNo: '104210000004',
    prepMinutes: 20,
    minOrderPaise: 0,
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
    expect(byEta.map((v) => v.id)).toEqual(['v_chai', 'v_meat', 'v_ganga', 'v_mithila']);

    // Even though Mithila has 4.9 rating, it stays sorted below open vendors
    const byRating = sortCustomerVendors(SAMPLE_VENDORS, 'rating');
    expect(byRating.map((v) => v.id)).toEqual(['v_ganga', 'v_chai', 'v_meat', 'v_mithila']);

    const byPrice = sortCustomerVendors(SAMPLE_VENDORS, 'price', false);
    expect(byPrice.map((v) => v.id)).toEqual(['v_chai', 'v_ganga', 'v_meat', 'v_mithila']);
  });

  it('partitions vendors cleanly into open and closed lists', () => {
    const { openVendors, closedVendors } = partitionCustomerVendors(SAMPLE_VENDORS);
    expect(openVendors.map((v) => v.id)).toEqual(['v_ganga', 'v_chai', 'v_meat']);
    expect(closedVendors.map((v) => v.id)).toEqual(['v_mithila']);
  });
});
