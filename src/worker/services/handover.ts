import { eq, and, inArray } from 'drizzle-orm';
import type { Database } from '../db';
import { orders } from '../db/schema';
import { generate4DigitCode } from '../utils/crypto';

export async function generateHandoverCode(db: Database, gateId: string): Promise<string> {
  // Query active codes at this specific gate
  const activeOrders = await db
    .select({ handoverCode: orders.handoverCode })
    .from(orders)
    .where(
      and(
        eq(orders.gateId, gateId),
        inArray(orders.status, ['placed', 'accepted', 'out_for_delivery', 'at_gate'])
      )
    );

  const existingCodes = new Set(activeOrders.map((o) => o.handoverCode));

  // Try generating a non-colliding 4-digit code
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = generate4DigitCode();
    if (!existingCodes.has(candidate)) {
      return candidate;
    }
  }

  // Fallback if space is extremely dense (e.g. 10,000 active orders at 1 gate, which won't happen in prototype)
  return generate4DigitCode();
}
