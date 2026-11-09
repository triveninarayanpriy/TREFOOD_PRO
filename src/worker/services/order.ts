export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'out_for_delivery'
  | 'at_gate'
  | 'delivered'
  | 'cancelled'
  | 'expired';

export type UserRole = 'student' | 'vendor' | 'admin' | 'system';

export class StatusTransitionError extends Error {
  public code: string;
  public status: 400 | 403;

  constructor(code: string, message: string, status: 400 | 403 = 400) {
    super(message);
    this.name = 'StatusTransitionError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Validates state machine transition and permissions
 */
export function nextStatus(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
  actorRole: UserRole,
  isOwner = false
): { ok: true } {
  // Terminal statuses cannot transition
  if (currentStatus === 'delivered' || currentStatus === 'cancelled' || currentStatus === 'expired') {
    throw new StatusTransitionError(
      'ORDER_ALREADY_FINAL',
      `Order is already ${currentStatus} and cannot change status.`,
      400
    );
  }

  // Same status is a no-op
  if (currentStatus === targetStatus) {
    return { ok: true };
  }

  // Cancellation transitions
  if (targetStatus === 'cancelled') {
    if (actorRole === 'admin') {
      return { ok: true };
    }
    if (actorRole === 'vendor') {
      if (currentStatus === 'placed' || currentStatus === 'accepted') {
        return { ok: true };
      }
      throw new StatusTransitionError(
        'CANNOT_CANCEL_IN_TRANSIT',
        'Vendors cannot cancel orders that are out for delivery or at the gate.',
        400
      );
    }
    if (actorRole === 'student') {
      if (isOwner && currentStatus === 'placed') {
        return { ok: true };
      }
      throw new StatusTransitionError(
        'CANNOT_CANCEL_ACCEPTED_ORDER',
        'Orders cannot be cancelled once the vendor has accepted them.',
        400
      );
    }
    throw new StatusTransitionError('UNAUTHORIZED', 'You are not authorized to cancel this order.', 403);
  }

  // Expiration transition
  if (targetStatus === 'expired') {
    if ((actorRole === 'system' || actorRole === 'admin') && currentStatus === 'placed') {
      return { ok: true };
    }
    throw new StatusTransitionError(
      'INVALID_EXPIRATION',
      'Only unaccepted orders can expire.',
      400
    );
  }

  // Standard forward progression
  switch (currentStatus) {
    case 'placed':
      if (targetStatus === 'accepted') {
        if (actorRole === 'vendor' || actorRole === 'admin') return { ok: true };
        throw new StatusTransitionError('UNAUTHORIZED', 'Only vendors or admins can accept orders.', 403);
      }
      break;

    case 'accepted':
      if (targetStatus === 'out_for_delivery') {
        if (actorRole === 'vendor' || actorRole === 'admin') return { ok: true };
        throw new StatusTransitionError('UNAUTHORIZED', 'Only vendors or admins can dispatch orders.', 403);
      }
      break;

    case 'out_for_delivery':
      if (targetStatus === 'at_gate') {
        if (actorRole === 'vendor' || actorRole === 'admin') return { ok: true };
        throw new StatusTransitionError('UNAUTHORIZED', 'Only vendors or admins can mark arrival at gate.', 403);
      }
      break;

    case 'at_gate':
      if (targetStatus === 'delivered') {
        // Domain rule: ONLY the customer who owns the order can confirm delivery, and only when status is at_gate
        if (actorRole === 'student' && isOwner) return { ok: true };
        if (actorRole === 'admin') return { ok: true };
        throw new StatusTransitionError(
          'CUSTOMER_CONFIRMATION_REQUIRED',
          'Only the customer who placed the order can confirm handover delivery at the gate.',
          403
        );
      }
      break;
  }

  throw new StatusTransitionError(
    'INVALID_STATUS_TRANSITION',
    `Invalid status transition from "${currentStatus}" to "${targetStatus}".`,
    400
  );
}
