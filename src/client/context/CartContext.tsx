import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface CartItem {
  itemId: string;
  lineKey?: string;
  name: string;
  pricePaise: number;
  quantity: number;
  notes?: string;
  isVeg?: boolean;
  variantId?: string;
  variantLabel?: string;
  addonIds?: string[];
  addonsLabel?: string;
}

export function buildCartLineKey(
  itemId: string,
  variantId?: string,
  addonIds?: string[]
): string {
  const addonsPart = addonIds && addonIds.length > 0 ? [...addonIds].sort().join(',') : '';
  return `${itemId}::${variantId || ''}::${addonsPart}`;
}

export interface CartVendor {
  id: string;
  name: string;
  slug: string;
}

export interface CartQuote {
  subtotalPaise: number;
  packingTotalPaise?: number;
  discountPaise?: number;
  deliveryFeePaise: number;
  totalPaise: number;
  etaMinutes: number;
  canDeliver: boolean;
  reason?: string;
  couponApplied?: string | null;
  couponError?: string | null;
  alternativeGates?: Array<{ id: string; name: string }>;
}

interface CartContextType {
  vendor: CartVendor | null;
  items: CartItem[];
  selectedGateId: string;
  setSelectedGateId: (gateId: string) => void;
  couponCode: string;
  setCouponCode: (code: string) => void;
  scheduledFor: number | null;
  setScheduledFor: (ts: number | null) => void;
  addItem: (vendor: CartVendor, item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (itemIdOrKey: string, quantity: number) => void;
  updateNotes: (itemIdOrKey: string, notes: string) => void;
  removeItem: (itemIdOrKey: string) => void;
  clearCart: () => void;
  itemCount: number;
  quote: CartQuote | null;
  quoteLoading: boolean;
  quoteError: string | null;
  pendingVendorSwitch: {
    vendor: CartVendor;
    item: Omit<CartItem, 'quantity'> & { quantity?: number };
  } | null;
  confirmVendorSwitch: () => void;
  cancelVendorSwitch: () => void;
  refetchQuote: () => Promise<CartQuote | null | undefined>;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_GATE_KEY = 'trefood_gate_id';
const STORAGE_CART_KEY = 'trefood_cart_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize gate from URL param, localStorage, or default to Main Gate
  const [selectedGateId, setSelectedGateIdState] = useState<string>(() => {
    const urlGate = searchParams.get('gate');
    if (urlGate) return urlGate;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_GATE_KEY);
      if (stored) return stored;
    }
    return 'gate_main';
  });

  const [vendor, setVendor] = useState<CartVendor | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_CART_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.vendor || null;
        }
      } catch {}
    }
    return null;
  });

  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_CART_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.items || [];
        }
      } catch {}
    }
    return [];
  });

  const [couponCode, setCouponCodeState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_CART_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.couponCode || '';
        }
      } catch {}
    }
    return '';
  });

  const [scheduledFor, setScheduledForState] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_CART_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return typeof parsed.scheduledFor === 'number' ? parsed.scheduledFor : null;
        }
      } catch {}
    }
    return null;
  });

  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [pendingVendorSwitch, setPendingVendorSwitch] = useState<{
    vendor: CartVendor;
    item: Omit<CartItem, 'quantity'> & { quantity?: number };
  } | null>(null);

  // Sync gate changes to localStorage and URL
  const setSelectedGateId = useCallback(
    (gateId: string) => {
      setSelectedGateIdState(gateId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_GATE_KEY, gateId);
      }
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('gate', gateId);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setCouponCode = useCallback((code: string) => {
    setCouponCodeState(code.trim().toUpperCase());
  }, []);

  const setScheduledFor = useCallback((ts: number | null) => {
    setScheduledForState(ts);
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_CART_KEY,
        JSON.stringify({ vendor, items, couponCode, scheduledFor })
      );
    }
  }, [vendor, items, couponCode, scheduledFor]);

  // Debounced quote fetcher
  const fetchQuote = useCallback(async () => {
    if (!vendor || items.length === 0 || !selectedGateId) {
      setQuote(null);
      setQuoteLoading(false);
      setQuoteError(null);
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);

    try {
      const res = await fetch('/api/cart/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateId: selectedGateId,
          vendorId: vendor.id,
          couponCode: couponCode || undefined,
          items: items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            variantId: i.variantId,
            addonIds: i.addonIds,
          })),
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok) {
        if (res.status === 409) {
          setQuoteError(data.error?.message || 'Some items changed in price or availability.');
        } else {
          setQuoteError(data.error?.message || 'Could not calculate quote.');
        }
        setQuote(null);
      } else {
        const newQuote: CartQuote = {
          subtotalPaise: data.subtotalPaise,
          packingTotalPaise: data.packingTotalPaise,
          discountPaise: data.discountPaise,
          deliveryFeePaise: data.deliveryFeePaise,
          totalPaise: data.totalPaise,
          etaMinutes: data.etaMinutes,
          canDeliver: data.canDeliver,
          reason: data.reason,
          couponApplied: data.couponApplied,
          couponError: data.couponError,
          alternativeGates: data.alternativeGates,
        };
        setQuote(newQuote);
        return newQuote;
      }
    } catch {
      setQuoteError('Network error checking prices');
      return null;
    } finally {
      setQuoteLoading(false);
    }
  }, [vendor, items, selectedGateId, couponCode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuote();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchQuote]);

  const addItem = useCallback(
    (newVendor: CartVendor, newItem: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
      const qtyToAdd = Math.max(1, newItem.quantity ?? 1);
      const lineKey = newItem.lineKey || buildCartLineKey(newItem.itemId, newItem.variantId, newItem.addonIds);

      if (vendor && vendor.id !== newVendor.id && items.length > 0) {
        setPendingVendorSwitch({ vendor: newVendor, item: { ...newItem, lineKey, quantity: qtyToAdd } });
        return;
      }

      setVendor(newVendor);
      setItems((prev) => {
        const existingIdx = prev.findIndex(
          (i) => (i.lineKey || buildCartLineKey(i.itemId, i.variantId, i.addonIds)) === lineKey
        );
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: next[existingIdx].quantity + qtyToAdd,
            notes: newItem.notes ?? next[existingIdx].notes,
          };
          return next;
        }
        return [...prev, { ...newItem, lineKey, quantity: qtyToAdd }];
      });
    },
    [vendor, items.length]
  );

  const confirmVendorSwitch = useCallback(() => {
    if (pendingVendorSwitch) {
      const qty = Math.max(1, pendingVendorSwitch.item.quantity ?? 1);
      setVendor(pendingVendorSwitch.vendor);
      setItems([{ ...pendingVendorSwitch.item, quantity: qty }]);
      setScheduledForState(null);
      setPendingVendorSwitch(null);
    }
  }, [pendingVendorSwitch]);

  const cancelVendorSwitch = useCallback(() => {
    setPendingVendorSwitch(null);
  }, []);

  const updateQuantity = useCallback((itemIdOrKey: string, quantity: number) => {
    setItems((prev) => {
      const matches = (i: CartItem) =>
        i.lineKey === itemIdOrKey || (!i.lineKey && i.itemId === itemIdOrKey) || i.itemId === itemIdOrKey;
      if (quantity <= 0) {
        return prev.filter((i) => !matches(i));
      }
      return prev.map((i) => (matches(i) ? { ...i, quantity } : i));
    });
  }, []);

  const updateNotes = useCallback((itemIdOrKey: string, notes: string) => {
    const safeNotes = notes.slice(0, 80);
    setItems((prev) =>
      prev.map((i) =>
        i.lineKey === itemIdOrKey || i.itemId === itemIdOrKey ? { ...i, notes: safeNotes } : i
      )
    );
  }, []);

  const removeItem = useCallback((itemIdOrKey: string) => {
    setItems((prev) =>
      prev.filter((i) => i.lineKey !== itemIdOrKey && i.itemId !== itemIdOrKey)
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setVendor(null);
    setQuote(null);
    setQuoteError(null);
    setScheduledForState(null);
    setCouponCodeState('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_CART_KEY);
    }
  }, []);

  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        vendor,
        items,
        selectedGateId,
        setSelectedGateId,
        couponCode,
        setCouponCode,
        scheduledFor,
        setScheduledFor,
        addItem,
        updateQuantity,
        updateNotes,
        removeItem,
        clearCart,
        itemCount,
        quote,
        quoteLoading,
        quoteError,
        pendingVendorSwitch,
        confirmVendorSwitch,
        cancelVendorSwitch,
        refetchQuote: fetchQuote,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
