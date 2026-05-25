import {
  buildHostedCheckoutUrl,
  createPaymentIntent,
  formatPaymentUri,
  parseHostedCheckoutUrl,
  parsePaymentUri,
  resolveGasRoute,
  verifyPaymentReceipt,
  type CreatePaymentIntentOptions,
  type GasRouteDecision,
  type PaymentIntent,
  type PaymentIntentInput,
  type PaymentReceipt,
  type ReceiptVerificationOptions,
  type ReceiptVerificationResult,
} from "@zkpay/core";

export interface ZkpayClientOptions {
  baseUrl?: string;
  sponsorEnabled?: boolean;
}

export interface CreatePaymentOptions extends CreatePaymentIntentOptions {
  requiresProgrammableTransaction?: boolean;
}

export interface CreatedPayment {
  intent: PaymentIntent;
  checkoutUrl: string;
  paymentUri: string;
  gasRoute: GasRouteDecision;
}

export class ZkpayClient {
  private readonly baseUrl: string;
  private readonly sponsorEnabled: boolean;

  constructor(options: ZkpayClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://zkpay.sh";
    this.sponsorEnabled = options.sponsorEnabled ?? true;
  }

  createPayment(
    input: PaymentIntentInput,
    options: CreatePaymentOptions = {},
  ): CreatedPayment {
    const intent = createPaymentIntent(input, options);
    const gasRoute = resolveGasRoute({
      intent,
      sponsorEnabled: this.sponsorEnabled,
      requiresProgrammableTransaction: options.requiresProgrammableTransaction,
    });

    return {
      intent,
      checkoutUrl: buildHostedCheckoutUrl(this.baseUrl, intent),
      paymentUri: formatPaymentUri(intent),
      gasRoute,
    };
  }

  parseCheckoutUrl(checkoutUrl: string): PaymentIntent {
    return parseHostedCheckoutUrl(checkoutUrl);
  }

  parsePaymentUri(paymentUri: string): PaymentIntent {
    return parsePaymentUri(paymentUri);
  }

  verifyPayment(
    intent: PaymentIntent,
    receipt: PaymentReceipt,
    options: ReceiptVerificationOptions = {},
  ): ReceiptVerificationResult {
    return verifyPaymentReceipt(intent, receipt, options);
  }
}

export function createZkpayClient(
  options: ZkpayClientOptions = {},
): ZkpayClient {
  return new ZkpayClient(options);
}

export * from "@zkpay/core";
