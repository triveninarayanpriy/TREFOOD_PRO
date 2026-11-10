import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

export interface CartVendor {
  id: string;
  name: string;
  slug: string;
}

export type CheckoutPaymentMethod = 'pay_at_gate' | 'upi_simulated';

export const STORAGE_GATE_KEY = 'trefood_gate_id';
export const STORAGE_CART_KEY = 'trefood_cart_v1';

export function buildCartLineKey(
  itemId: string,
  variantId?: string,
  addonIds?: string[]
): string {
  const addonsPart = addonIds && addonIds.length > 0 ? [...addonIds].sort().join(',') : '';
  return `${itemId}::${variantId || ''}::${addonsPart}`;
}

export interface CartStoreState {
  vendor: CartVendor | null;
  items: CartItem[];
  selectedGateId: string;
  couponCode: string;
  scheduledFor: number | null;
  deliveryInstruction: string;
  contactPhone: string;
  paymentMethod: CheckoutPaymentMethod;
  pendingVendorSwitch: {
    vendor: CartVendor;
    item: Omit<CartItem, 'quantity'> & { quantity?: number };
  } | null;

  setSelectedGateId: (gateId: string) => void;
  setCouponCode: (code: string) => void;
  setScheduledFor: (ts: number | null) => void;
  setDeliveryInstruction: (note: string) => void;
  setContactPhone: (phone: string) => void;
  setPaymentMethod: (method: CheckoutPaymentMethod) => void;
  addItem: (vendor: CartVendor, item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  confirmVendorSwitch: () => void;
  cancelVendorSwitch: () => void;
  updateQuantity: (itemIdOrKey: string, quantity: number) => void;
  updateNotes: (itemIdOrKey: string, notes: string) => void;
  removeItem: (itemIdOrKey: string) => void;
  clearCart: () => void;
}

function getInitialGateId(): string {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const urlGate = urlParams.get('gate');
    if (urlGate) return urlGate;
    const saved = localStorage.getItem(STORAGE_GATE_KEY);
    if (saved) return saved;
  }
  return 'gate_main';
}

export const useCartStore = create<CartStoreState>()(
  persist(
    (set, get) => ({
      vendor: null,
      items: [],
      selectedGateId: getInitialGateId(),
      couponCode: '',
      scheduledFor: null,
      deliveryInstruction: '',
      contactPhone: '',
      paymentMethod: 'pay_at_gate',
      pendingVendorSwitch: null,

      setSelectedGateId: (gateId) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_GATE_KEY, gateId);
        }
        set({ selectedGateId: gateId });
      },

      setCouponCode: (code) => {
        set({ couponCode: code.trim().toUpperCase() });
      },

      setScheduledFor: (ts) => {
        set({ scheduledFor: ts });
      },

      setDeliveryInstruction: (note) => {
        set({ deliveryInstruction: note.slice(0, 200) });
      },

      setContactPhone: (phone) => {
        set({ contactPhone: phone.replace(/\D/g, '').slice(0, 10) });
      },

      setPaymentMethod: (method) => {
        set({ paymentMethod: method });
      },

      addItem: (newVendor, newItem) => {
        const { vendor, items } = get();
        const qtyToAdd = Math.max(1, newItem.quantity ?? 1);
        const lineKey =
          newItem.lineKey || buildCartLineKey(newItem.itemId, newItem.variantId, newItem.addonIds);

        if (vendor && vendor.id !== newVendor.id && items.length > 0) {
          set({
            pendingVendorSwitch: {
              vendor: newVendor,
              item: { ...newItem, lineKey, quantity: qtyToAdd },
            },
          });
          return;
        }

        const existingIdx = items.findIndex(
          (i) => (i.lineKey || buildCartLineKey(i.itemId, i.variantId, i.addonIds)) === lineKey
        );

        let nextItems: CartItem[];
        if (existingIdx >= 0) {
          nextItems = [...items];
          nextItems[existingIdx] = {
            ...nextItems[existingIdx],
            quantity: nextItems[existingIdx].quantity + qtyToAdd,
            notes: newItem.notes ?? nextItems[existingIdx].notes,
          };
        } else {
          nextItems = [...items, { ...newItem, lineKey, quantity: qtyToAdd }];
        }

        set({ vendor: newVendor, items: nextItems });
      },

      confirmVendorSwitch: () => {
        const { pendingVendorSwitch } = get();
        if (!pendingVendorSwitch) return;
        const qty = Math.max(1, pendingVendorSwitch.item.quantity ?? 1);
        set({
          vendor: pendingVendorSwitch.vendor,
          items: [{ ...pendingVendorSwitch.item, quantity: qty }],
          couponCode: '',
          scheduledFor: null,
          pendingVendorSwitch: null,
        });
      },

      cancelVendorSwitch: () => {
        set({ pendingVendorSwitch: null });
      },

      updateQuantity: (itemIdOrKey, quantity) => {
        set((state) => {
          const matches = (i: CartItem) =>
            i.lineKey === itemIdOrKey || (!i.lineKey && i.itemId === itemIdOrKey) || i.itemId === itemIdOrKey;

          const nextItems =
            quantity <= 0
              ? state.items.filter((i) => !matches(i))
              : state.items.map((i) => (matches(i) ? { ...i, quantity } : i));

          return {
            items: nextItems,
            vendor: nextItems.length === 0 ? null : state.vendor,
            scheduledFor: nextItems.length === 0 ? null : state.scheduledFor,
            couponCode: nextItems.length === 0 ? '' : state.couponCode,
          };
        });
      },

      updateNotes: (itemIdOrKey, notes) => {
        const safeNotes = notes.slice(0, 80);
        set((state) => ({
          items: state.items.map((i) =>
            i.lineKey === itemIdOrKey || i.itemId === itemIdOrKey ? { ...i, notes: safeNotes } : i
          ),
        }));
      },

      removeItem: (itemIdOrKey) => {
        set((state) => {
          const nextItems = state.items.filter(
            (i) => i.lineKey !== itemIdOrKey && i.itemId !== itemIdOrKey
          );
          return {
            items: nextItems,
            vendor: nextItems.length === 0 ? null : state.vendor,
            scheduledFor: nextItems.length === 0 ? null : state.scheduledFor,
            couponCode: nextItems.length === 0 ? '' : state.couponCode,
          };
        });
      },

      clearCart: () => {
        set({
          vendor: null,
          items: [],
          couponCode: '',
          scheduledFor: null,
          deliveryInstruction: '',
          pendingVendorSwitch: null,
        });
      },
    }),
    {
      name: STORAGE_CART_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        vendor: state.vendor,
        items: state.items,
        selectedGateId: state.selectedGateId,
        couponCode: state.couponCode,
        scheduledFor: state.scheduledFor,
        deliveryInstruction: state.deliveryInstruction,
        contactPhone: state.contactPhone,
        paymentMethod: state.paymentMethod,
      }),
    }
  )
);
