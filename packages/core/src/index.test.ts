import { describe, expect, it } from "vitest";
import {
  createPaymentIntent,
  resolveGasRoute,
  verifyPaymentReceipt,
  type PaymentReceipt,
} from "./index.js";

describe("@zkpay/core", () => {
  it("creates a payment intent with a nonce and stable id", () => {
    const intent = createPaymentIntent({
      amount: "20",
      coin: "USDC",
      receiver: "0x84f",
      label: "API credits",
      metadata: {
        orderId: "ord_123",
      },
    });

    expect(intent.id).toMatch(/^zkp_/);
    expect(intent.nonce.length).toBeGreaterThanOrEqual(12);
    expect(intent.metadata.orderId).toBe("ord_123");
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

  it("routes eligible stablecoin transfers as gasless", () => {
    const intent = createPaymentIntent({
      amount: "20",
      coin: "USDC",
      receiver: "0x84f",
      label: "API credits",
    });

    expect(resolveGasRoute({ intent })).toEqual({
      kind: "gasless-stablecoin",
      payerGas: "zero",
      reason: "eligible-stablecoin-transfer",
    });
  });

  it("routes programmable checkout through sponsor when enabled", () => {
    const intent = createPaymentIntent({
      amount: "20",
      coin: "USDC",
      receiver: "0x84f",
      label: "API credits",
    });

    expect(
      resolveGasRoute({
        intent,
        requiresProgrammableTransaction: true,
        sponsorEnabled: true,
      }),
    ).toMatchObject({
      kind: "sponsored",
      payerGas: "sponsored",
      reason: "programmable-checkout-requires-sponsor",
    });
  });

  it("verifies matching receipt fields before fulfillment", () => {
    const intent = createPaymentIntent({
      amount: "20",
      coin: "USDC",
      receiver: "0x84f",
      label: "API credits",
    });

    const receipt: PaymentReceipt = {
      paymentId: intent.id,
      status: "succeeded",
      txDigest: "9T9T9T9T9T9T9T9T",
      amount: intent.amount,
      coin: intent.coin,
      receiver: intent.receiver,
      nonce: intent.nonce,
      settledAt: new Date().toISOString(),
    };

    expect(verifyPaymentReceipt(intent, receipt)).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("rejects mismatched receipt fields", () => {
    const intent = createPaymentIntent({
      amount: "20",
      coin: "USDC",
      receiver: "0x84f",
      label: "API credits",
    });

    const result = verifyPaymentReceipt(intent, {
      paymentId: intent.id,
      status: "succeeded",
      txDigest: "9T9T9T9T9T9T9T9T",
      amount: "21",
      coin: intent.coin,
      receiver: intent.receiver,
      nonce: intent.nonce,
      settledAt: new Date().toISOString(),
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("amount_mismatch");
  });
});
