import {
  createPaymentIntent,
  resolveGasRoute,
  verifyPaymentReceipt,
  type GasRouteDecision,
  type PaymentIntent,
  type PaymentIntentInput,
  type PaymentReceipt,
  type ReceiptVerificationResult,
} from "@zkpay/core";

export interface ZkpayClientOptions {
  baseUrl?: string;
  sponsorEnabled?: boolean;
}

export interface CreatedPayment {
  intent: PaymentIntent;
  checkoutUrl: string;
  gasRoute: GasRouteDecision;
}

export class ZkpayClient {
  private readonly baseUrl: string;
  private readonly sponsorEnabled: boolean;

  constructor(options: ZkpayClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://zkpay.sh";
    this.sponsorEnabled = options.sponsorEnabled ?? true;
  }

  createPayment(input: PaymentIntentInput): CreatedPayment {
    const intent = createPaymentIntent(input);
    const gasRoute = resolveGasRoute({
      intent,
      sponsorEnabled: this.sponsorEnabled,
    });

    return {
      intent,
      checkoutUrl: `${this.baseUrl}/pay/${intent.id}`,
      gasRoute,
    };
  }

  verifyPayment(
    intent: PaymentIntent,
    receipt: PaymentReceipt,
  ): ReceiptVerificationResult {
    return verifyPaymentReceipt(intent, receipt);
  }
}

export * from "@zkpay/core";
