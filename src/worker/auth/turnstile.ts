export interface TurnstileVerifyResult {
  ok: boolean;
  skipped?: boolean;
  errorCodes?: string[];
}

export async function verifyTurnstileToken(params: {
  enabled?: string;
  secretKey?: string;
  token?: string | null;
  remoteIp?: string | null;
}): Promise<TurnstileVerifyResult> {
  if (params.enabled !== 'true') {
    return { ok: true, skipped: true };
  }

  if (!params.secretKey) {
    // Feature flag enabled without secret key fails closed
    return { ok: false, errorCodes: ['missing-secret-key'] };
  }

  if (!params.token || !params.token.trim()) {
    return { ok: false, errorCodes: ['missing-input-response'] };
  }

  const formData = new FormData();
  formData.append('secret', params.secretKey);
  formData.append('response', params.token.trim());
  if (params.remoteIp) {
    formData.append('remoteip', params.remoteIp);
  }

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });
    const outcome = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    return {
      ok: Boolean(outcome.success),
      errorCodes: outcome['error-codes'],
    };
  } catch {
    return { ok: false, errorCodes: ['siteverify-network-error'] };
  }
}
