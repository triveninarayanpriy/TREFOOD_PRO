import { describe, it, expect } from 'vitest';
import { MAX_HANDOVER_ATTEMPTS, verifyHandoverAttempt } from '@shared/handover';

describe('Handover Code Verification Logic', () => {
  it('verifies matching 4-digit handover code cleanly', () => {
    const res = verifyHandoverAttempt({
      expectedCode: '4821',
      submittedCode: '4821',
      currentAttempts: 0,
    });
    expect(res.ok).toBe(true);
    expect(res.locked).toBe(false);
    expect(res.attemptsRemaining).toBe(MAX_HANDOVER_ATTEMPTS);
  });

  it('rejects non-4-digit inputs without burning attempts', () => {
    const res = verifyHandoverAttempt({
      expectedCode: '4821',
      submittedCode: '12',
      currentAttempts: 2,
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('INVALID_CODE_FORMAT');
    expect(res.newAttempts).toBe(2);
    expect(res.attemptsRemaining).toBe(3);
  });

  it('decrements remaining attempts on wrong code and locks after 5th attempt', () => {
    const r1 = verifyHandoverAttempt({ expectedCode: '4821', submittedCode: '0000', currentAttempts: 0 });
    expect(r1.ok).toBe(false);
    expect(r1.locked).toBe(false);
    expect(r1.newAttempts).toBe(1);
    expect(r1.attemptsRemaining).toBe(4);

    const r5 = verifyHandoverAttempt({ expectedCode: '4821', submittedCode: '1111', currentAttempts: 4 });
    expect(r5.ok).toBe(false);
    expect(r5.locked).toBe(true);
    expect(r5.newAttempts).toBe(5);
    expect(r5.attemptsRemaining).toBe(0);
    expect(r5.reason).toBe('CODE_LOCKED');

    // Even entering the correct code once locked stays blocked until vendor assist
    const r6 = verifyHandoverAttempt({ expectedCode: '4821', submittedCode: '4821', currentAttempts: 5 });
    expect(r6.ok).toBe(false);
    expect(r6.locked).toBe(true);
    expect(r6.reason).toBe('CODE_LOCKED');
  });
});
