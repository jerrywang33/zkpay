import { randomBytes } from "node:crypto";
import { z } from "zod";

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

export const suiAddressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{1,64}$/, "Expected a Sui address-like hex string");

export const decimalAmountSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)(\.\d+)?$/, "Expected a positive decimal string")
  .refine((value) => Number(value) > 0, "Amount must be greater than zero");

export const paymentIntentInputSchema = z.object({
  amount: decimalAmountSchema,
  coin: z.string().min(1),
  receiver: suiAddressSchema,
  label: z.string().min(1).max(120),
  metadata: z.record(z.string()).default({}),
  expiresAt: z.string().datetime().optional(),
});

export const paymentIntentSchema = paymentIntentInputSchema.extend({
  id: z.string().regex(/^zkp_[a-zA-Z0-9_-]+$/),
  nonce: z.string().min(12),
  createdAt: z.string().datetime(),
});

export type PaymentIntentInput = z.input<typeof paymentIntentInputSchema>;
export type PaymentIntent = z.infer<typeof paymentIntentSchema>;

export type GasRouteKind = "gasless-stablecoin" | "sponsored" | "payer-paid";

export interface GasRoutePolicyInput {
  intent: PaymentIntent;
  requiresProgrammableTransaction?: boolean;
  sponsorEnabled?: boolean;
  supportedGaslessCoins?: readonly string[];
}

export interface GasRouteDecision {
  kind: GasRouteKind;
  payerGas: "zero" | "sponsored" | "payer-paid";
  reason:
    | "eligible-stablecoin-transfer"
    | "programmable-checkout-requires-sponsor"
    | "stablecoin-not-supported-for-gasless"
    | "sponsor-disabled";
}

export const paymentReceiptSchema = z.object({
  paymentId: z.string().regex(/^zkp_[a-zA-Z0-9_-]+$/),
  status: z.enum(["succeeded", "failed"]),
  txDigest: z.string().min(16),
  amount: decimalAmountSchema,
  coin: z.string().min(1),
  receiver: suiAddressSchema,
  nonce: z.string().min(12),
  settledAt: z.string().datetime(),
});

export type PaymentReceipt = z.infer<typeof paymentReceiptSchema>;

export interface ReceiptVerificationResult {
  ok: boolean;
  errors: string[];
}

export function createPaymentIntent(input: PaymentIntentInput): PaymentIntent {
  const parsed = paymentIntentInputSchema.parse(input);
  const createdAt = new Date().toISOString();

  return paymentIntentSchema.parse({
    ...parsed,
    id: `zkp_${randomToken(12)}`,
    nonce: randomToken(18),
    createdAt,
  });
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
): ReceiptVerificationResult {
  const parsedReceipt = paymentReceiptSchema.safeParse(receipt);

  if (!parsedReceipt.success) {
    return {
      ok: false,
      errors: parsedReceipt.error.issues.map((issue) => issue.message),
    };
  }

  const errors: string[] = [];

  if (receipt.status !== "succeeded") errors.push("receipt_not_succeeded");
  if (receipt.paymentId !== intent.id) errors.push("payment_id_mismatch");
  if (receipt.amount !== intent.amount) errors.push("amount_mismatch");
  if (receipt.coin !== intent.coin) errors.push("coin_mismatch");
  if (receipt.receiver.toLowerCase() !== intent.receiver.toLowerCase()) {
    errors.push("receiver_mismatch");
  }
  if (receipt.nonce !== intent.nonce) errors.push("nonce_mismatch");

  return {
    ok: errors.length === 0,
    errors,
  };
}

function randomToken(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}
