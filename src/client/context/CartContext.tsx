import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { trackFunnelEvent } from '../utils/analytics';
import {
  useCartStore,
  buildCartLineKey,
  type CartItem,
  type CartVendor,
  type CheckoutPaymentMethod,
} from '../store/cartStore';
import type { ScheduleSlot, SuggestedGateInfo } from '@shared/curfew';

export { buildCartLineKey, type CartItem, type CartVendor, type CheckoutPaymentMethod };

export interface SuggestedAddonItem {
  id: string;
  name: string;
  pricePaise: number;
  isVeg: boolean;
}

export interface CartQuote {
  subtotalPaise: number;
  packingTotalPaise?: number;
  discountPaise?: number;
  deliveryFeePaise: number;
  totalPaise: number;
  minOrderPaise?: number;
  meetsMinOrder?: boolean;
  shortfallPaise?: number;
  suggestedAddons?: SuggestedAddonItem[];
  etaMinutes: number;
  etaAt?: number;
  estimatedArrivalIst?: string;
  latestOrderTime?: string | null;
  canDeliver: boolean;
  reason?: string;
  deliveryMessage?: string;
  couponApplied?: string | null;
  couponError?: string | null;
  suggestedGate?: SuggestedGateInfo | null;
  alternativeGates?: SuggestedGateInfo[];
  availableSlots?: ScheduleSlot[];
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
  deliveryInstruction: string;
  setDeliveryInstruction: (note: string) => void;
  contactPhone: string;
  setContactPhone: (phone: string) => void;
  paymentMethod: CheckoutPaymentMethod;
  setPaymentMethod: (method: CheckoutPaymentMethod) => void;
  addItem: (vendor: CartVendor, item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (itemIdOrKey: string, quantity: number) => void;
  updateNotes: (itemIdOrKey: string, notes: string) => void;
  removeItem: (itemIdOrKey: string) => void;
  clearCart: () => void;
  itemCount: number;
  quote: CartQuote | null;
  quoteLoading: boolean;
  quoteError: string | null;
  isOfflineEstimate: boolean;
  pendingVendorSwitch: {
    vendor: CartVendor;
    item: Omit<CartItem, 'quantity'> & { quantity?: number };
  } | null;
  confirmVendorSwitch: () => void;
  cancelVendorSwitch: () => void;
  refetchQuote: () => Promise<CartQuote | null | undefined>;
}

const CartContext = createContext<CartContextType | null>(null);

interface QuoteApiResponse {
  ok?: boolean;
  subtotalPaise: number;
  packingTotalPaise?: number;
  discountPaise?: number;
  deliveryFeePaise: number;
  totalPaise: number;
  minOrderPaise?: number;
  meetsMinOrder?: boolean;
  shortfallPaise?: number;
  suggestedAddons?: SuggestedAddonItem[];
  etaMinutes: number;
  etaAt?: number;
  estimatedArrivalIst?: string;
  latestOrderTime?: string | null;
  canDeliver: boolean;
  deliveryReason?: string;
  deliveryMessage?: string;
  couponApplied?: string | null;
  couponError?: string | null;
  suggestedGate?: SuggestedGateInfo | null;
  alternativeGates?: SuggestedGateInfo[];
  availableSlots?: ScheduleSlot[];
  error?: { code?: string; message?: string };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const vendor = useCartStore((s) => s.vendor);
  const items = useCartStore((s) => s.items);
  const selectedGateId = useCartStore((s) => s.selectedGateId);
  const setStoreGateId = useCartStore((s) => s.setSelectedGateId);
  const couponCode = useCartStore((s) => s.couponCode);
  const setCouponCode = useCartStore((s) => s.setCouponCode);
  const scheduledFor = useCartStore((s) => s.scheduledFor);
  const setScheduledFor = useCartStore((s) => s.setScheduledFor);
  const deliveryInstruction = useCartStore((s) => s.deliveryInstruction);
  const setDeliveryInstruction = useCartStore((s) => s.setDeliveryInstruction);
  const contactPhone = useCartStore((s) => s.contactPhone);
  const setContactPhone = useCartStore((s) => s.setContactPhone);
  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod);
  const addItem = useCartStore((s) => s.addItem);
  const confirmVendorSwitch = useCartStore((s) => s.confirmVendorSwitch);
  const cancelVendorSwitch = useCartStore((s) => s.cancelVendorSwitch);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const updateNotes = useCartStore((s) => s.updateNotes);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const pendingVendorSwitch = useCartStore((s) => s.pendingVendorSwitch);

  const trackedAddItem = useCallback(
    (newVendor: CartVendor, newItem: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
      addItem(newVendor, newItem);
      trackFunnelEvent('add_to_cart', {
        gateId: selectedGateId,
        vendorId: newVendor.id,
      });
    },
    [addItem, selectedGateId]
  );

  const trackedConfirmVendorSwitch = useCallback(() => {
    if (pendingVendorSwitch) {
      trackFunnelEvent('add_to_cart', {
        gateId: selectedGateId,
        vendorId: pendingVendorSwitch.vendor.id,
      });
    }
    confirmVendorSwitch();
  }, [confirmVendorSwitch, pendingVendorSwitch, selectedGateId]);

  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isOfflineEstimate, setIsOfflineEstimate] = useState(false);

  // Sync URL ?gate= into Zustand if initially loaded via deep link
  useEffect(() => {
    const urlGate = searchParams.get('gate');
    if (urlGate && urlGate !== selectedGateId) {
      setStoreGateId(urlGate);
    }
  }, []);

  const setSelectedGateId = useCallback(
    (gateId: string) => {
      setStoreGateId(gateId);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('gate', gateId);
          return next;
        },
        { replace: true }
      );
    },
    [setStoreGateId, setSearchParams]
  );

  // Compute safe offline fallback subtotal from locally persisted items
  const buildOfflineFallback = useCallback((): CartQuote => {
    const subtotalPaise = items.reduce((sum, i) => sum + i.pricePaise * i.quantity, 0);
    return {
      subtotalPaise,
      packingTotalPaise: 0,
      discountPaise: 0,
      deliveryFeePaise: 0,
      totalPaise: subtotalPaise,
      meetsMinOrder: true,
      shortfallPaise: 0,
      etaMinutes: 25,
      canDeliver: true,
    };
  }, [items]);

  const fetchQuote = useCallback(async () => {
    if (!vendor || items.length === 0 || !selectedGateId) {
      setQuote(null);
      setQuoteLoading(false);
      setQuoteError(null);
      setIsOfflineEstimate(false);
      return null;
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
          scheduledFor: scheduledFor || undefined,
          items: items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            variantId: i.variantId,
            addonIds: i.addonIds,
          })),
        }),
      });

      const data = (await res.json()) as QuoteApiResponse;
      if (!res.ok) {
        if (res.status === 409) {
          setQuoteError(data.error?.message || 'Some items changed in price or availability.');
        } else {
          setQuoteError(data.error?.message || 'Could not calculate quote.');
        }
        setQuote(null);
        setIsOfflineEstimate(false);
        return null;
      }

      const newQuote: CartQuote = {
        subtotalPaise: data.subtotalPaise,
        packingTotalPaise: data.packingTotalPaise,
        discountPaise: data.discountPaise,
        deliveryFeePaise: data.deliveryFeePaise,
        totalPaise: data.totalPaise,
        minOrderPaise: data.minOrderPaise,
        meetsMinOrder: data.meetsMinOrder,
        shortfallPaise: data.shortfallPaise,
        suggestedAddons: data.suggestedAddons,
        etaMinutes: data.etaMinutes,
        etaAt: data.etaAt,
        estimatedArrivalIst: data.estimatedArrivalIst,
        latestOrderTime: data.latestOrderTime,
        canDeliver: data.canDeliver,
        reason: data.deliveryReason,
        deliveryMessage: data.deliveryMessage,
        couponApplied: data.couponApplied,
        couponError: data.couponError,
        suggestedGate: data.suggestedGate,
        alternativeGates: data.alternativeGates,
        availableSlots: data.availableSlots,
      };
      setQuote(newQuote);
      setIsOfflineEstimate(false);
      return newQuote;
    } catch {
      const offlineQuote = buildOfflineFallback();
      setQuote(offlineQuote);
      setIsOfflineEstimate(true);
      return null;
    } finally {
      setQuoteLoading(false);
    }
  }, [vendor, items, selectedGateId, couponCode, scheduledFor, buildOfflineFallback]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuote();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchQuote]);

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
        deliveryInstruction,
        setDeliveryInstruction,
        contactPhone,
        setContactPhone,
        paymentMethod,
        setPaymentMethod,
        addItem: trackedAddItem,
        updateQuantity,
        updateNotes,
        removeItem,
        clearCart,
        itemCount,
        quote,
        quoteLoading,
        quoteError,
        isOfflineEstimate,
        pendingVendorSwitch,
        confirmVendorSwitch: trackedConfirmVendorSwitch,
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
