import { eq, and, inArray } from 'drizzle-orm';
import type { Database } from '../db';
import { menuItems } from '../db/schema';

export interface CartItemInput {
  itemId: string;
  quantity: number;
  expectedPricePaise?: number;
  notes?: string;
}

export interface CartItemPriced {
  itemId: string;
  name: string;
  pricePaise: number;
  quantity: number;
  subtotalPaise: number;
  isVeg: boolean;
  inStock: boolean;
  notes?: string;
}

export interface CartQuoteResult {
  vendorId: string;
  items: CartItemPriced[];
  subtotalPaise: number;
  deliveryFeePaise: number; // Always 0
  totalPaise: number;
  totalQuantity: number;
}

export class CartConflictError extends Error {
  public code: 'ITEM_OUT_OF_STOCK' | 'PRICE_CHANGED';
  public status = 409;
  public details: unknown;

  constructor(code: 'ITEM_OUT_OF_STOCK' | 'PRICE_CHANGED', message: string, details?: unknown) {
    super(message);
    this.name = 'CartConflictError';
    this.code = code;
    this.details = details;
  }
}

export async function priceCart(
  db: Database,
  vendorId: string,
  clientItems: CartItemInput[]
): Promise<CartQuoteResult> {
  if (!clientItems || clientItems.length === 0) {
    return {
      vendorId,
      items: [],
      subtotalPaise: 0,
      deliveryFeePaise: 0,
      totalPaise: 0,
      totalQuantity: 0,
    };
  }

  const itemIds = clientItems.map((i) => i.itemId);

  // Fetch using index on vendor_id
  const dbItems = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.vendorId, vendorId), inArray(menuItems.id, itemIds)));

  const dbItemMap = new Map(dbItems.map((item) => [item.id, item]));

  const pricedItems: CartItemPriced[] = [];
  let subtotalPaise = 0;
  let totalQuantity = 0;

  for (const clientItem of clientItems) {
    const dbItem = dbItemMap.get(clientItem.itemId);

    if (!dbItem) {
      throw new CartConflictError(
        'ITEM_OUT_OF_STOCK',
        `Item with ID "${clientItem.itemId}" is no longer available on this vendor's menu.`,
        { itemId: clientItem.itemId }
      );
    }

    if (!dbItem.inStock) {
      throw new CartConflictError(
        'ITEM_OUT_OF_STOCK',
        `"${dbItem.name}" is currently out of stock.`,
        { itemId: dbItem.id, name: dbItem.name }
      );
    }

    if (
      clientItem.expectedPricePaise !== undefined &&
      clientItem.expectedPricePaise !== dbItem.pricePaise
    ) {
      throw new CartConflictError(
        'PRICE_CHANGED',
        `Price for "${dbItem.name}" has changed from ₹${(clientItem.expectedPricePaise / 100).toFixed(2)} to ₹${(dbItem.pricePaise / 100).toFixed(2)}.`,
        {
          itemId: dbItem.id,
          name: dbItem.name,
          oldPricePaise: clientItem.expectedPricePaise,
          newPricePaise: dbItem.pricePaise,
        }
      );
    }

    const itemSubtotal = dbItem.pricePaise * clientItem.quantity;
    subtotalPaise += itemSubtotal;
    totalQuantity += clientItem.quantity;

    pricedItems.push({
      itemId: dbItem.id,
      name: dbItem.name,
      pricePaise: dbItem.pricePaise,
      quantity: clientItem.quantity,
      subtotalPaise: itemSubtotal,
      isVeg: dbItem.isVeg,
      inStock: dbItem.inStock,
      notes: clientItem.notes?.trim() || undefined,
    });
  }

  return {
    vendorId,
    items: pricedItems,
    subtotalPaise,
    deliveryFeePaise: 0, // Zero delivery fee guarantee
    totalPaise: subtotalPaise,
    totalQuantity,
  };
}
