import {
  buildHostedCheckoutUrl,
  createPaymentIntent,
  findGaslessStablecoinAsset,
  formatPaymentUri,
  parseHostedCheckoutRequest,
  parseHostedCheckoutUrl,
  parsePaymentUri,
  resolveGasRoute,
  signPaymentIntent,
  verifyPaymentIntentSignature,
  verifyPaymentReceipt,
  type CreatePaymentIntentOptions,
  type GasRouteDecision,
  type GaslessStablecoinAsset,
  type HostedCheckoutRequest,
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
  signingSecret?: string;
  sui?: SuiReceiptVerifierOptions;
}

export interface CreatePaymentOptions extends CreatePaymentIntentOptions {
  requiresProgrammableTransaction?: boolean;
  checkout?: HostedCheckoutOptions;
  gaslessStablecoins?: readonly GaslessStablecoinAsset[];
  signingSecret?: string;
  signature?: string;
}

export interface CreatedPayment {
  intent: PaymentIntent;
  checkoutUrl: string;
  paymentUri: string;
  gasRoute: GasRouteDecision;
  signature?: string;
}

export class ZkpayClient {
  private readonly baseUrl: string;
  private readonly sponsorEnabled: boolean;
  private readonly gaslessStablecoins?: readonly GaslessStablecoinAsset[];
  private readonly signingSecret?: string;
  private readonly sui?: SuiReceiptVerifierOptions;

  constructor(options: ZkpayClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://zkpay.sh";
    this.sponsorEnabled = options.sponsorEnabled ?? true;
    this.gaslessStablecoins = options.gaslessStablecoins;
    this.signingSecret = options.signingSecret;
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
    const gaslessStablecoins =
      options.gaslessStablecoins ?? this.gaslessStablecoins;
    const signature =
      options.signature ??
      (options.signingSecret ?? this.signingSecret
        ? signPaymentIntent(
            intent,
            options.signingSecret ?? this.signingSecret ?? "",
          )
        : undefined);
    const checkout = resolveCheckoutOptionsFromRegistry(
      intent,
      {
        ...options.checkout,
        signature,
      },
      gaslessStablecoins,
    );
    const gasRoute = resolveGasRoute({
      intent,
      sponsorEnabled: this.sponsorEnabled,
      requiresProgrammableTransaction,
      network: checkout?.network,
      coinType: checkout?.coinType,
      decimals: checkout?.decimals,
      gaslessStablecoins,
    });

    return {
      intent,
      checkoutUrl: buildHostedCheckoutUrl(this.baseUrl, intent, checkout),
      paymentUri: formatPaymentUri(intent),
      gasRoute,
      signature,
    };
  }

  parseCheckoutUrl(checkoutUrl: string): PaymentIntent {
    return parseHostedCheckoutUrl(checkoutUrl);
  }

  parseCheckoutRequest(checkoutUrl: string): HostedCheckoutRequest {
    return parseHostedCheckoutRequest(checkoutUrl);
  }

  parsePaymentUri(paymentUri: string): PaymentIntent {
    return parsePaymentUri(paymentUri);
  }

  verifyIntentSignature(
    intent: PaymentIntent,
    signature: string,
    secret = this.signingSecret,
  ): boolean {
    if (!secret) return false;
    return verifyPaymentIntentSignature(intent, signature, secret);
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

function resolveCheckoutOptionsFromRegistry(
  intent: PaymentIntent,
  checkout: HostedCheckoutOptions | undefined,
  gaslessStablecoins: readonly GaslessStablecoinAsset[] | undefined,
): HostedCheckoutOptions | undefined {
  if (!gaslessStablecoins) return checkout;

  const asset = findGaslessStablecoinAsset({
    coin: intent.coin,
    network: checkout?.network,
    coinType: checkout?.coinType,
    decimals: checkout?.decimals,
    registry: gaslessStablecoins,
  });

  if (!asset) return checkout;

  return {
    ...checkout,
    network: checkout?.network ?? asset.network,
    coinType: checkout?.coinType ?? asset.coinType,
    decimals: checkout?.decimals ?? asset.decimals,
  };
}
