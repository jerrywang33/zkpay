import { describe, expect, it } from "vitest";
import {
  buildHostedCheckoutUrl,
  createPaymentIntent,
  formatPaymentUri,
  isPaymentIntentExpired,
  parseHostedCheckoutUrl,
  parsePaymentUri,
  resolveGasRoute,
  verifyPaymentReceipt,
  type PaymentIntent,
  type PaymentReceipt,
} from "./index.js";

const createdAt = "2026-05-25T00:00:00.000Z";

function makeIntent(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
  const intent = createPaymentIntent(
    {
      amount: "20",
      coin: "USDC",
      receiver: "0x84f",
      label: "API credits",
      metadata: {
        orderId: "ord_123",
      },
      expiresAt: "2026-05-26T00:00:00.000Z",
    },
    {
      id: "zkp_test123",
      nonce: "nonce_test123",
      now: createdAt,
    },
  );

  return { ...intent, ...overrides };
}

function makeReceipt(intent: PaymentIntent): PaymentReceipt {
  return {
    paymentId: intent.id,
    status: "succeeded",
    txDigest: "9T9T9T9T9T9T9T9T",
    amount: intent.amount,
    coin: intent.coin,
    receiver: intent.receiver,
    nonce: intent.nonce,
    settledAt: "2026-05-25T01:00:00.000Z",
  };
}

describe("@zkpay/core", () => {
  it("creates a payment intent with a nonce and stable id", () => {
    const intent = makeIntent();

    expect(intent).toMatchObject({
      id: "zkp_test123",
      amount: "20",
      coin: "USDC",
      receiver: "0x84f",
      label: "API credits",
      nonce: "nonce_test123",
      createdAt,
      metadata: {
        orderId: "ord_123",
      },
    });
  });

  it("rejects invalid amounts", () => {
    expect(() =>
      createPaymentIntent({
        amount: "0",
        coin: "USDC",
        receiver: "0x84f",
        label: "API credits",
      }),
    ).toThrow();
  });

  it("round-trips a payment URI", () => {
    const intent = makeIntent();
    const uri = formatPaymentUri(intent);

    expect(uri).toContain("zkpay://payment/zkp_test123");
    expect(parsePaymentUri(uri)).toEqual(intent);
  });

  it("round-trips a hosted checkout URL payload", () => {
    const intent = makeIntent();
    const checkoutUrl = buildHostedCheckoutUrl("https://zkpay.sh", intent);

    expect(checkoutUrl).toContain("https://zkpay.sh/pay/zkp_test123");
    expect(parseHostedCheckoutUrl(checkoutUrl)).toEqual(intent);
  });

  it("detects expired payment intents", () => {
    const intent = makeIntent();

    expect(isPaymentIntentExpired(intent, "2026-05-25T23:59:59.000Z")).toBe(
      false,
    );
    expect(isPaymentIntentExpired(intent, "2026-05-26T00:00:00.000Z")).toBe(
      true,
    );
  });

  it("routes eligible stablecoin transfers as gasless", () => {
    expect(resolveGasRoute({ intent: makeIntent() })).toEqual({
      kind: "gasless-stablecoin",
      payerGas: "zero",
      reason: "eligible-stablecoin-transfer",
    });
  });

  it("routes programmable checkout through sponsor when enabled", () => {
    expect(
      resolveGasRoute({
        intent: makeIntent(),
        requiresProgrammableTransaction: true,
        sponsorEnabled: true,
      }),
    ).toMatchObject({
      kind: "sponsored",
      payerGas: "sponsored",
      reason: "programmable-checkout-requires-sponsor",
    });
  });

  it("falls back to payer-paid when sponsor is disabled", () => {
    expect(
      resolveGasRoute({
        intent: makeIntent({ coin: "WAL" }),
        sponsorEnabled: false,
      }),
    ).toEqual({
      kind: "payer-paid",
      payerGas: "payer-paid",
      reason: "sponsor-disabled",
    });
  });

  it("verifies matching receipt fields before fulfillment", () => {
    const intent = makeIntent();
    const receipt = makeReceipt(intent);

    expect(verifyPaymentReceipt(intent, receipt)).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("rejects mismatched receipt fields", () => {
    const intent = makeIntent();
    const result = verifyPaymentReceipt(intent, {
      ...makeReceipt(intent),
      amount: "21",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("amount_mismatch");
  });

  it("can enforce intent expiration during receipt verification", () => {
    const intent = makeIntent();
    const receipt = makeReceipt(intent);

    expect(
      verifyPaymentReceipt(intent, receipt, {
        enforceExpiration: true,
        now: "2026-05-26T00:00:01.000Z",
      }),
    ).toEqual({
      ok: false,
      errors: ["intent_expired"],
    });
  });
});
