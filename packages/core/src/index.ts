import { randomBytes } from "node:crypto";
import { z } from "zod";

export const ZKPAY_URI_PROTOCOL = "zkpay:";
export const ZKPAY_URI_HOST = "payment";

export const SUPPORTED_GASLESS_STABLECOINS = [
  "USDsui",
  "SuiUSDe",
  "AUSD",
  "FDUSD",
  "USDB",
  "USDC",
  "USDY",
] as const;

export type SupportedGaslessStablecoin =
  (typeof SUPPORTED_GASLESS_STABLECOINS)[number];

export const paymentIntentIdSchema = z
  .string()
  .regex(/^zkp_[a-zA-Z0-9_-]+$/, "Expected a zkpay payment id");

export const nonceSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{12,96}$/, "Expected a URL-safe nonce");

export const suiAddressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{1,64}$/, "Expected a Sui address-like hex string");

export const decimalAmountSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)(\.\d+)?$/, "Expected a positive decimal string")
  .refine((value) => Number(value) > 0, "Amount must be greater than zero");

export const metadataSchema = z
  .record(z.string().min(1).max(64), z.string().max(512))
  .default({});

export const paymentIntentInputSchema = z.object({
  amount: decimalAmountSchema,
  coin: z.string().min(1).max(160),
  receiver: suiAddressSchema,
  label: z.string().min(1).max(120),
  metadata: metadataSchema,
  expiresAt: z.string().datetime().optional(),
});

export const paymentIntentSchema = paymentIntentInputSchema.extend({
  id: paymentIntentIdSchema,
  nonce: nonceSchema,
  createdAt: z.string().datetime(),
});

export type PaymentIntentInput = z.input<typeof paymentIntentInputSchema>;
export type PaymentIntent = z.infer<typeof paymentIntentSchema>;

export interface CreatePaymentIntentOptions {
  id?: string;
  nonce?: string;
  now?: Date | string;
}

export type GasRouteKind = "gasless-stablecoin" | "sponsored" | "payer-paid";
export type PayerGas = "zero" | "sponsored" | "payer-paid";

export interface GasRoutePolicyInput {
  intent: PaymentIntent;
  requiresProgrammableTransaction?: boolean;
  sponsorEnabled?: boolean;
  supportedGaslessCoins?: readonly string[];
}

export type GasRouteReason =
  | "eligible-stablecoin-transfer"
  | "programmable-checkout-requires-sponsor"
  | "stablecoin-not-supported-for-gasless"
  | "sponsor-disabled";

export interface GasRouteDecision {
  kind: GasRouteKind;
  payerGas: PayerGas;
  reason: GasRouteReason;
}

export const paymentReceiptSchema = z.object({
  paymentId: paymentIntentIdSchema,
  status: z.enum(["succeeded", "failed"]),
  txDigest: z.string().min(16),
  amount: decimalAmountSchema,
  coin: z.string().min(1).max(160),
  receiver: suiAddressSchema,
  nonce: nonceSchema,
  settledAt: z.string().datetime(),
});

export type PaymentReceipt = z.infer<typeof paymentReceiptSchema>;

export type ReceiptVerificationError =
  | "invalid_receipt"
  | "receipt_not_succeeded"
  | "payment_id_mismatch"
  | "amount_mismatch"
  | "coin_mismatch"
  | "receiver_mismatch"
  | "nonce_mismatch"
  | "intent_expired";

export interface ReceiptVerificationOptions {
  now?: Date | string;
  enforceExpiration?: boolean;
}

export interface ReceiptVerificationResult {
  ok: boolean;
  errors: ReceiptVerificationError[];
  details?: string[];
}

export function createPaymentIntent(
  input: PaymentIntentInput,
  options: CreatePaymentIntentOptions = {},
): PaymentIntent {
  const parsed = paymentIntentInputSchema.parse(input);
  const createdAt = toIsoString(options.now ?? new Date());

  return paymentIntentSchema.parse({
    ...parsed,
    id: options.id ?? `zkp_${randomToken(12)}`,
    nonce: options.nonce ?? randomToken(18),
    createdAt,
  });
}

export function formatPaymentUri(intent: PaymentIntent): string {
  const parsed = paymentIntentSchema.parse(intent);
  const url = new URL(
    `${ZKPAY_URI_PROTOCOL}//${ZKPAY_URI_HOST}/${encodeURIComponent(parsed.id)}`,
  );

  url.searchParams.set("amount", parsed.amount);
  url.searchParams.set("coin", parsed.coin);
  url.searchParams.set("receiver", parsed.receiver);
  url.searchParams.set("label", parsed.label);
  url.searchParams.set("nonce", parsed.nonce);
  url.searchParams.set("createdAt", parsed.createdAt);

  if (parsed.expiresAt) {
    url.searchParams.set("expiresAt", parsed.expiresAt);
  }

  for (const [key, value] of Object.entries(parsed.metadata).sort()) {
    url.searchParams.set(`metadata.${key}`, value);
  }

  return url.toString();
}

export function parsePaymentUri(uri: string): PaymentIntent {
  const url = new URL(uri);

  if (url.protocol !== ZKPAY_URI_PROTOCOL || url.hostname !== ZKPAY_URI_HOST) {
    throw new Error("Invalid zkpay payment URI");
  }

  const metadata: Record<string, string> = {};

  for (const [key, value] of url.searchParams.entries()) {
    if (key.startsWith("metadata.")) {
      metadata[key.slice("metadata.".length)] = value;
    }
  }

  return paymentIntentSchema.parse({
    id: decodeURIComponent(url.pathname.replace(/^\//, "")),
    amount: requiredSearchParam(url, "amount"),
    coin: requiredSearchParam(url, "coin"),
    receiver: requiredSearchParam(url, "receiver"),
    label: requiredSearchParam(url, "label"),
    nonce: requiredSearchParam(url, "nonce"),
    createdAt: requiredSearchParam(url, "createdAt"),
    expiresAt: url.searchParams.get("expiresAt") ?? undefined,
    metadata,
  });
}

export function encodePaymentIntentPayload(intent: PaymentIntent): string {
  const canonicalIntent = paymentIntentSchema.parse(intent);
  return Buffer.from(JSON.stringify(canonicalIntent), "utf8").toString(
    "base64url",
  );
}

export function decodePaymentIntentPayload(payload: string): PaymentIntent {
  const decoded = Buffer.from(payload, "base64url").toString("utf8");
  return paymentIntentSchema.parse(JSON.parse(decoded));
}

export function buildHostedCheckoutUrl(
  baseUrl: string,
  intent: PaymentIntent,
): string {
  const url = new URL(`/pay/${encodeURIComponent(intent.id)}`, baseUrl);
  url.searchParams.set("intent", encodePaymentIntentPayload(intent));
  return url.toString();
}

export function parseHostedCheckoutUrl(url: string): PaymentIntent {
  const parsed = new URL(url);
  const payload = parsed.searchParams.get("intent");

  if (!payload) {
    throw new Error("Hosted checkout URL is missing intent payload");
  }

  return decodePaymentIntentPayload(payload);
}

export function isPaymentIntentExpired(
  intent: PaymentIntent,
  now: Date | string = new Date(),
): boolean {
  if (!intent.expiresAt) return false;
  return new Date(intent.expiresAt).getTime() <= new Date(now).getTime();
}

export function resolveGasRoute(input: GasRoutePolicyInput): GasRouteDecision {
  const supported =
    input.supportedGaslessCoins ?? SUPPORTED_GASLESS_STABLECOINS;
  const isGaslessCoin = supported.includes(input.intent.coin);

  if (isGaslessCoin && !input.requiresProgrammableTransaction) {
    return {
      kind: "gasless-stablecoin",
      payerGas: "zero",
      reason: "eligible-stablecoin-transfer",
    };
  }

  if (input.sponsorEnabled) {
    return {
      kind: "sponsored",
      payerGas: "sponsored",
      reason: input.requiresProgrammableTransaction
        ? "programmable-checkout-requires-sponsor"
        : "stablecoin-not-supported-for-gasless",
    };
  }

  return {
    kind: "payer-paid",
    payerGas: "payer-paid",
    reason: "sponsor-disabled",
  };
}

export function verifyPaymentReceipt(
  intent: PaymentIntent,
  receipt: PaymentReceipt,
  options: ReceiptVerificationOptions = {},
): ReceiptVerificationResult {
  const parsedReceipt = paymentReceiptSchema.safeParse(receipt);

  if (!parsedReceipt.success) {
    return {
      ok: false,
      errors: ["invalid_receipt"],
      details: parsedReceipt.error.issues.map((issue) => issue.message),
    };
  }

  const errors: ReceiptVerificationError[] = [];

  if (receipt.status !== "succeeded") errors.push("receipt_not_succeeded");
  if (receipt.paymentId !== intent.id) errors.push("payment_id_mismatch");
  if (receipt.amount !== intent.amount) errors.push("amount_mismatch");
  if (receipt.coin !== intent.coin) errors.push("coin_mismatch");
  if (receipt.receiver.toLowerCase() !== intent.receiver.toLowerCase()) {
    errors.push("receiver_mismatch");
  }
  if (receipt.nonce !== intent.nonce) errors.push("nonce_mismatch");
  if (
    options.enforceExpiration &&
    isPaymentIntentExpired(intent, options.now ?? new Date())
  ) {
    errors.push("intent_expired");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function requiredSearchParam(url: URL, key: string): string {
  const value = url.searchParams.get(key);
  if (!value) throw new Error(`Missing ${key} in payment URI`);
  return value;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function randomToken(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}
