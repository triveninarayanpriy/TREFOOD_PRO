export type PaymentGatewayId = 'simulated_upi' | 'razorpay' | 'cashfree';

export interface UpiPaymentRequest {
  amountPaise: number;
  orderAttemptKey: string;
  customerPhone?: string;
  vpaOrApp: string;
  simulatedOutcome?: 'success' | 'failed';
}

export interface UpiPaymentResult {
  ok: boolean;
  provider: PaymentGatewayId;
  paymentRef?: string;
  errorMessage?: string;
}

export interface PaymentGatewayAdapter {
  readonly id: PaymentGatewayId;
  readonly displayName: string;
  initiateUpi(req: UpiPaymentRequest): Promise<UpiPaymentResult>;
}

/**
 * Simulated UPI adapter wired cleanly behind a gateway interface so Razorpay or Cashfree
 * checkout SDKs can be dropped in without rewriting CheckoutModal.
 */
export const simulatedUpiAdapter: PaymentGatewayAdapter = {
  id: 'simulated_upi',
  displayName: 'UPI Instant (Prototype Simulation)',
  async initiateUpi(req) {
    // Realistic brief gateway roundtrip for interactive feedback
    await new Promise((resolve) => setTimeout(resolve, 250));

    if (req.simulatedOutcome === 'failed') {
      return {
        ok: false,
        provider: 'simulated_upi',
        errorMessage: 'Bank server declined or timed out UPI collect request (no amount debited).',
      };
    }

    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return {
      ok: true,
      provider: 'simulated_upi',
      paymentRef: `UPI-${Date.now().toString().slice(-6)}-${suffix}`,
    };
  },
};
