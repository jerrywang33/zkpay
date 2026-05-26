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
  type GaslessStablecoinAsset,
  type HostedCheckoutOptions,
  type PaymentIntent,
  type PaymentIntentInput,
  type PaymentReceipt,
  type ReceiptVerificationOptions,
  type ReceiptVerificationResult,
} from "@zkpay/core";
import {
  SuiReceiptVerifier,
  buildSuiPaymentTransaction,
  type BuildSuiPaymentTransactionInput,
  type BuiltSuiPaymentTransaction,
  type SuiReceiptVerifierOptions,
  type SuiSettlementVerificationInput,
  type SuiSettlementVerificationResult,
} from "./sui.js";

export interface ZkpayClientOptions {
  baseUrl?: string;
  sponsorEnabled?: boolean;
  gaslessStablecoins?: readonly GaslessStablecoinAsset[];
  sui?: SuiReceiptVerifierOptions;
}

export interface CreatePaymentOptions extends CreatePaymentIntentOptions {
  requiresProgrammableTransaction?: boolean;
  checkout?: HostedCheckoutOptions;
  gaslessStablecoins?: readonly GaslessStablecoinAsset[];
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
  private readonly gaslessStablecoins?: readonly GaslessStablecoinAsset[];
  private readonly sui?: SuiReceiptVerifierOptions;

  constructor(options: ZkpayClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://zkpay.sh";
    this.sponsorEnabled = options.sponsorEnabled ?? true;
    this.gaslessStablecoins = options.gaslessStablecoins;
    this.sui = options.sui;
  }

  createPayment(
    input: PaymentIntentInput,
    options: CreatePaymentOptions = {},
  ): CreatedPayment {
    const intent = createPaymentIntent(input, options);
    const requiresProgrammableTransaction = Boolean(
      options.requiresProgrammableTransaction || options.checkout?.bindingPackageId,
    );
    const gasRoute = resolveGasRoute({
      intent,
      sponsorEnabled: this.sponsorEnabled,
      requiresProgrammableTransaction,
      network: options.checkout?.network,
      coinType: options.checkout?.coinType,
      decimals: options.checkout?.decimals,
      gaslessStablecoins:
        options.gaslessStablecoins ?? this.gaslessStablecoins,
    });

    return {
      intent,
      checkoutUrl: buildHostedCheckoutUrl(this.baseUrl, intent, options.checkout),
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

  buildSuiPaymentTransaction(
    input: BuildSuiPaymentTransactionInput,
  ): BuiltSuiPaymentTransaction {
    return buildSuiPaymentTransaction(input);
  }

  verifySuiPayment(
    input: SuiSettlementVerificationInput,
  ): Promise<SuiSettlementVerificationResult> {
    return new SuiReceiptVerifier(this.sui).verify(input);
  }
}

export function createZkpayClient(
  options: ZkpayClientOptions = {},
): ZkpayClient {
  return new ZkpayClient(options);
}

export * from "@zkpay/core";
export * from "./sui.js";
