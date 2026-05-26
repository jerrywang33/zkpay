import {
  SuiJsonRpcClient,
  getJsonRpcFullnodeUrl,
  type BalanceChange,
  type CoinMetadata,
  type SuiEvent,
  type SuiTransactionBlockResponse,
} from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  paymentIntentSchema,
  verifyPaymentReceipt,
  type PaymentIntent,
  type PaymentReceipt,
  type ReceiptVerificationOptions,
  type ReceiptVerificationResult,
} from "@zkpay/core";

export type SuiNetwork = "mainnet" | "testnet" | "devnet" | "localnet";
export type SuiAmountPolicy = "exact" | "at-least";

export const ZKPAY_RECEIPT_MODULE = "receipt";
export const ZKPAY_RECEIPT_FUNCTION = "bind";
export const ZKPAY_RECEIPT_EVENT = "PaymentBound";

export interface SuiRpcClient {
  getCoinMetadata(input: {
    coinType: string;
    signal?: AbortSignal;
  }): Promise<CoinMetadata | null>;
  getTransactionBlock(input: {
    digest: string;
    options?: {
      showBalanceChanges?: boolean;
      showEffects?: boolean;
      showEvents?: boolean;
      showInput?: boolean;
    };
    signal?: AbortSignal;
  }): Promise<SuiTransactionBlockResponse>;
}

export interface SuiReceiptVerifierOptions {
  client?: SuiRpcClient;
  network?: SuiNetwork;
  rpcUrl?: string;
  defaultCoinTypes?: Record<string, string>;
}

export interface BuildSuiPaymentTransactionInput {
  intent: PaymentIntent;
  payer: string;
  coinType?: string;
  decimals: number;
  gasBudget?: number | string | bigint;
  useGasCoin?: boolean;
  binding?: SuiPaymentBindingConfig;
}

export interface BuiltSuiPaymentTransaction {
  transaction: Transaction;
  amountAtomic: string;
  coinType: string;
  receiver: string;
  bindingEventType?: string;
}

export interface SuiPaymentBindingConfig {
  packageId: string;
  module?: string;
  functionName?: string;
  eventName?: string;
  eventType?: string;
}

export interface AddSuiPaymentBindingInput extends SuiPaymentBindingConfig {
  transaction: Transaction;
  intent: PaymentIntent;
  coinType: string;
  amountAtomic: string;
}

export interface SuiSettlementVerificationInput
  extends ReceiptVerificationOptions {
  intent: PaymentIntent;
  txDigest: string;
  coinType?: string;
  decimals?: number;
  expectedSender?: string;
  amountPolicy?: SuiAmountPolicy;
  binding?: SuiPaymentBindingConfig;
  signal?: AbortSignal;
}

export type SuiSettlementVerificationError =
  | "coin_type_missing"
  | "transaction_not_found"
  | "transaction_failed"
  | "coin_metadata_missing"
  | "invalid_amount"
  | "receiver_payment_missing"
  | "amount_mismatch"
  | "sender_mismatch"
  | "binding_event_missing"
  | "binding_event_mismatch"
  | "local_receipt_failed";

export interface SuiSettlementVerificationResult {
  ok: boolean;
  errors: SuiSettlementVerificationError[];
  receipt?: PaymentReceipt;
  verification?: ReceiptVerificationResult;
  tx?: {
    digest: string;
    status: "success" | "failure" | "unknown";
    timestampMs?: string | null;
    coinType: string;
    amountAtomic: string;
    receiverDelta: string;
    senderDelta?: string;
    bindingEventType?: string;
  };
  warnings: string[];
}

export function buildSuiPaymentTransaction(
  input: BuildSuiPaymentTransactionInput,
): BuiltSuiPaymentTransaction {
  const intent = paymentIntentSchema.parse(input.intent);
  const coinType = resolveCoinType(intent, input.coinType);
  const amountAtomic = decimalToAtomicAmount(intent.amount, input.decimals);
  const transaction = new Transaction();

  transaction.setSender(input.payer);

  if (input.gasBudget !== undefined) {
    transaction.setGasBudget(input.gasBudget);
  }

  transaction.transferObjects(
    [
      transaction.balance({
        type: coinType,
        balance: BigInt(amountAtomic),
        useGasCoin: input.useGasCoin,
      }),
    ],
    intent.receiver,
  );

  const bindingEventType = input.binding
    ? addSuiPaymentBinding({
        transaction,
        intent,
        coinType,
        amountAtomic,
        ...input.binding,
      })
    : undefined;

  return {
    transaction,
    amountAtomic,
    coinType,
    receiver: intent.receiver,
    bindingEventType,
  };
}

export function addSuiPaymentBinding(
  input: AddSuiPaymentBindingInput,
): string {
  const intent = paymentIntentSchema.parse(input.intent);
  const packageId = normalizeSuiAddress(input.packageId);
  const moduleName = input.module ?? ZKPAY_RECEIPT_MODULE;
  const functionName = input.functionName ?? ZKPAY_RECEIPT_FUNCTION;
  const eventName = input.eventName ?? ZKPAY_RECEIPT_EVENT;
  const eventType =
    input.eventType ?? `${packageId}::${moduleName}::${eventName}`;

  assertU64Amount(input.amountAtomic);

  input.transaction.moveCall({
    target: `${packageId}::${moduleName}::${functionName}`,
    arguments: [
      input.transaction.pure.address(intent.receiver),
      input.transaction.pure.u64(input.amountAtomic),
      input.transaction.pure.vector("u8", utf8Bytes(input.coinType)),
      input.transaction.pure.vector("u8", utf8Bytes(intent.id)),
      input.transaction.pure.vector("u8", utf8Bytes(intent.nonce)),
    ],
  });

  return eventType;
}

export class SuiReceiptVerifier {
  private readonly client: SuiRpcClient;
  private readonly defaultCoinTypes: Record<string, string>;

  constructor(options: SuiReceiptVerifierOptions = {}) {
    const network = options.network ?? "testnet";

    this.client =
      options.client ??
      new SuiJsonRpcClient({
        network,
        url: options.rpcUrl ?? getJsonRpcFullnodeUrl(network),
      });
    this.defaultCoinTypes = options.defaultCoinTypes ?? {};
  }

  async verify(
    input: SuiSettlementVerificationInput,
  ): Promise<SuiSettlementVerificationResult> {
    const intent = paymentIntentSchema.parse(input.intent);
    const warnings = input.binding
      ? []
      : [
          "nonce_not_onchain_bound: v0.2 verifies settlement by digest, receiver, coin, and amount; pass binding to require an onchain zkpay receipt event.",
        ];
    let coinType: string;

    try {
      coinType = resolveCoinType(
        intent,
        input.coinType ?? this.defaultCoinTypes[intent.coin],
      );
    } catch {
      return {
        ok: false,
        errors: ["coin_type_missing"],
        warnings,
      };
    }

    let decimals = input.decimals;

    if (decimals === undefined) {
      const metadata = await this.client.getCoinMetadata({
        coinType,
        signal: input.signal,
      });

      if (!metadata) {
        return {
          ok: false,
          errors: ["coin_metadata_missing"],
          warnings,
        };
      }

      decimals = metadata.decimals;
    }

    let amountAtomic: string;

    try {
      amountAtomic = decimalToAtomicAmount(intent.amount, decimals);
    } catch {
      return {
        ok: false,
        errors: ["invalid_amount"],
        warnings,
      };
    }

    let tx: SuiTransactionBlockResponse;

    try {
      tx = await this.client.getTransactionBlock({
        digest: input.txDigest,
        options: {
          showBalanceChanges: true,
          showEffects: true,
          showEvents: Boolean(input.binding),
          showInput: true,
        },
        signal: input.signal,
      });
    } catch {
      return {
        ok: false,
        errors: ["transaction_not_found"],
        warnings,
      };
    }

    const errors: SuiSettlementVerificationError[] = [];
    const status = tx.effects?.status?.status ?? "unknown";

    if (status !== "success") {
      errors.push("transaction_failed");
    }

    const receiverDelta = sumBalanceChanges(
      tx.balanceChanges,
      intent.receiver,
      coinType,
    );
    const amountMatches =
      input.amountPolicy === "at-least"
        ? receiverDelta >= BigInt(amountAtomic)
        : receiverDelta === BigInt(amountAtomic);

    if (receiverDelta <= 0n) {
      errors.push("receiver_payment_missing");
    } else if (!amountMatches) {
      errors.push("amount_mismatch");
    }

    const senderDelta = input.expectedSender
      ? sumBalanceChanges(tx.balanceChanges, input.expectedSender, coinType)
      : undefined;

    if (input.expectedSender && (!senderDelta || senderDelta >= 0n)) {
      errors.push("sender_mismatch");
    }

    const bindingEventType = input.binding
      ? resolveBindingEventType(input.binding)
      : undefined;

    if (input.binding && bindingEventType) {
      const bindingResult = verifyBindingEvent(tx.events, {
        intent,
        coinType,
        amountAtomic,
        expectedSender: input.expectedSender,
        eventType: bindingEventType,
      });

      if (!bindingResult.found) {
        errors.push("binding_event_missing");
      } else if (!bindingResult.matches) {
        errors.push("binding_event_mismatch");
      }
    }

    const receipt: PaymentReceipt = {
      paymentId: intent.id,
      status: errors.length === 0 ? "succeeded" : "failed",
      txDigest: tx.digest,
      amount: intent.amount,
      coin: intent.coin,
      receiver: intent.receiver,
      nonce: intent.nonce,
      settledAt: timestampToIso(tx.timestampMs),
    };
    const verification = verifyPaymentReceipt(intent, receipt, {
      enforceExpiration: input.enforceExpiration,
      now: input.now,
    });

    if (!verification.ok) {
      errors.push("local_receipt_failed");
    }

    return {
      ok: errors.length === 0,
      errors,
      receipt,
      verification,
      tx: {
        digest: tx.digest,
        status,
        timestampMs: tx.timestampMs,
        coinType,
        amountAtomic,
        receiverDelta: receiverDelta.toString(),
        senderDelta: senderDelta?.toString(),
        bindingEventType,
      },
      warnings,
    };
  }
}

export function decimalToAtomicAmount(amount: string, decimals: number): string {
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(amount)) {
    throw new Error("Expected a positive decimal amount");
  }

  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error("Expected a non-negative integer decimals value");
  }

  const [whole, fraction = ""] = amount.split(".");

  if (fraction.length > decimals) {
    throw new Error("Amount has more decimal places than the coin supports");
  }

  const scale = 10n ** BigInt(decimals);
  const wholeAtomic = BigInt(whole) * scale;
  const fractionAtomic = BigInt((fraction.padEnd(decimals, "0") || "0"));

  return (wholeAtomic + fractionAtomic).toString();
}

function resolveCoinType(intent: PaymentIntent, coinType?: string): string {
  if (coinType) return coinType;
  if (intent.coin.includes("::")) return intent.coin;
  throw new Error("coinType is required when the payment intent coin is a symbol");
}

function resolveBindingEventType(binding: SuiPaymentBindingConfig): string {
  const packageId = normalizeSuiAddress(binding.packageId);

  return (
    binding.eventType ??
    `${packageId}::${binding.module ?? ZKPAY_RECEIPT_MODULE}::${
      binding.eventName ?? ZKPAY_RECEIPT_EVENT
    }`
  );
}

function verifyBindingEvent(
  events: SuiEvent[] | null | undefined,
  expected: {
    intent: PaymentIntent;
    coinType: string;
    amountAtomic: string;
    expectedSender?: string;
    eventType: string;
  },
): { found: boolean; matches: boolean } {
  const event = (events ?? []).find((item) =>
    sameCoinType(item.type, expected.eventType),
  );

  if (!event) {
    return {
      found: false,
      matches: false,
    };
  }

  const parsed = isRecord(event.parsedJson) ? event.parsedJson : {};
  const payer = readEventValue(parsed, "payer");
  const receiver = readEventValue(parsed, "receiver");
  const amountAtomic = readEventValue(parsed, "amount_atomic");
  const coinType = readEventValue(parsed, "coin_type");
  const paymentId = readEventValue(parsed, "payment_id");
  const nonce = readEventValue(parsed, "nonce");
  const matches =
    sameAddress(receiver, expected.intent.receiver) &&
    amountAtomic === expected.amountAtomic &&
    coinType === expected.coinType &&
    paymentId === expected.intent.id &&
    nonce === expected.intent.nonce &&
    (!expected.expectedSender || sameAddress(payer, expected.expectedSender));

  return {
    found: true,
    matches,
  };
}

function readEventValue(
  parsed: Record<string, unknown>,
  key: string,
): string | null {
  const value = parsed[key];

  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "number")) {
    return new TextDecoder().decode(Uint8Array.from(value));
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function utf8Bytes(value: string): number[] {
  return [...new TextEncoder().encode(value)];
}

function assertU64Amount(amountAtomic: string): void {
  const amount = BigInt(amountAtomic);
  const maxU64 = 2n ** 64n - 1n;

  if (amount < 0n || amount > maxU64) {
    throw new Error("Binding amount must fit in u64");
  }
}

function sumBalanceChanges(
  changes: BalanceChange[] | null | undefined,
  owner: string,
  coinType: string,
): bigint {
  return (changes ?? []).reduce((total, change) => {
    if (!sameCoinType(change.coinType, coinType)) return total;
    if (!sameAddress(ownerAddress(change.owner), owner)) return total;
    return total + BigInt(change.amount);
  }, 0n);
}

function ownerAddress(owner: BalanceChange["owner"]): string | null {
  if (typeof owner === "string") return null;
  if ("AddressOwner" in owner) return owner.AddressOwner;
  if ("ConsensusAddressOwner" in owner) return owner.ConsensusAddressOwner.owner;
  return null;
}

function sameAddress(left: string | null, right: string): boolean {
  if (!left) return false;

  try {
    return normalizeSuiAddress(left) === normalizeSuiAddress(right);
  } catch {
    return left.toLowerCase() === right.toLowerCase();
  }
}

function sameCoinType(left: string, right: string): boolean {
  return left === right || left.toLowerCase() === right.toLowerCase();
}

function timestampToIso(timestampMs: string | null | undefined): string {
  const timestamp = timestampMs ? Number(timestampMs) : Date.now();
  return new Date(Number.isFinite(timestamp) ? timestamp : Date.now()).toISOString();
}
