// Pure handover verification state & 5-attempt lockout rules

export const MAX_HANDOVER_ATTEMPTS = 5;

export interface HandoverVerifyResult {
  ok: boolean;
  locked: boolean;
  newAttempts: number;
  attemptsRemaining: number;
  reason?: 'CODE_LOCKED' | 'INVALID_CODE_FORMAT' | 'CODE_MISMATCH';
  message?: string;
}

export function verifyHandoverAttempt(params: {
  expectedCode: string;
  submittedCode: string;
  currentAttempts: number;
}): HandoverVerifyResult {
  const { expectedCode, submittedCode, currentAttempts } = params;

  if (currentAttempts >= MAX_HANDOVER_ATTEMPTS) {
    return {
      ok: false,
      locked: true,
      newAttempts: currentAttempts,
      attemptsRemaining: 0,
      reason: 'CODE_LOCKED',
      message: 'Handover verification locked after 5 failed attempts. Ask the vendor for handover assist.',
    };
  }

  const cleanSubmitted = submittedCode.trim();
  if (!/^\d{4}$/.test(cleanSubmitted)) {
    return {
      ok: false,
      locked: false,
      newAttempts: currentAttempts,
      attemptsRemaining: MAX_HANDOVER_ATTEMPTS - currentAttempts,
      reason: 'INVALID_CODE_FORMAT',
      message: 'Enter the exact 4-digit code printed on your packet.',
    };
  }

  if (cleanSubmitted !== expectedCode.trim()) {
    const newAttempts = currentAttempts + 1;
    const locked = newAttempts >= MAX_HANDOVER_ATTEMPTS;
    const attemptsRemaining = Math.max(0, MAX_HANDOVER_ATTEMPTS - newAttempts);

    return {
      ok: false,
      locked,
      newAttempts,
      attemptsRemaining,
      reason: locked ? 'CODE_LOCKED' : 'CODE_MISMATCH',
      message: locked
        ? 'Incorrect code (5/5 attempts). Handover locked — please show your ID to the vendor for handover assist.'
        : `Code does not match packet (${attemptsRemaining} attempts remaining).`,
    };
  }

  return {
    ok: true,
    locked: false,
    newAttempts: currentAttempts,
    attemptsRemaining: MAX_HANDOVER_ATTEMPTS - currentAttempts,
  };
}
