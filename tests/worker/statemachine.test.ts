import { describe, it, expect } from 'vitest';
import { nextStatus, StatusTransitionError } from '@worker/services/order';

describe('Order State Machine & Role Permissions', () => {
  it('allows valid progressive status transitions by authorized roles', () => {
    // placed -> accepted (vendor)
    expect(nextStatus('placed', 'accepted', 'vendor').ok).toBe(true);

    // accepted -> out_for_delivery (vendor)
    expect(nextStatus('accepted', 'out_for_delivery', 'vendor').ok).toBe(true);

    // out_for_delivery -> at_gate (vendor)
    expect(nextStatus('out_for_delivery', 'at_gate', 'vendor').ok).toBe(true);

    // at_gate -> delivered (customer owner)
    expect(nextStatus('at_gate', 'delivered', 'student', true).ok).toBe(true);
  });

  it('strictly forbids vendor from confirming delivery (customer only)', () => {
    expect(() => nextStatus('at_gate', 'delivered', 'vendor', false)).toThrowError(
      StatusTransitionError
    );
  });

  it('strictly forbids non-owner student from confirming delivery', () => {
    expect(() => nextStatus('at_gate', 'delivered', 'student', false)).toThrowError(
      StatusTransitionError
    );
  });

  it('allows student to cancel only while order is in placed status', () => {
    // In placed -> allowed
    expect(nextStatus('placed', 'cancelled', 'student', true).ok).toBe(true);

    // In accepted -> forbidden
    expect(() => nextStatus('accepted', 'cancelled', 'student', true)).toThrowError(
      StatusTransitionError
    );

    // In at_gate -> forbidden
    expect(() => nextStatus('at_gate', 'cancelled', 'student', true)).toThrowError(
      StatusTransitionError
    );
  });

  it('rejects illegal transitions that skip steps', () => {
    // placed -> at_gate (skipping accepted and out_for_delivery)
    expect(() => nextStatus('placed', 'at_gate', 'vendor')).toThrowError(
      StatusTransitionError
    );

    // placed -> delivered (skipping everything)
    expect(() => nextStatus('placed', 'delivered', 'student', true)).toThrowError(
      StatusTransitionError
    );
  });

  it('rejects transitions on already final orders (delivered, cancelled, expired)', () => {
    expect(() => nextStatus('delivered', 'cancelled', 'admin')).toThrowError(
      StatusTransitionError
    );
    expect(() => nextStatus('cancelled', 'placed', 'admin')).toThrowError(
      StatusTransitionError
    );
    expect(() => nextStatus('expired', 'accepted', 'vendor')).toThrowError(
      StatusTransitionError
    );
  });
});
