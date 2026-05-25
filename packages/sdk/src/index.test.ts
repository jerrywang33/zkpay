import { describe, expect, it } from "vitest";
import { ZkpayClient, type PaymentReceipt } from "./index.js";

describe("@zkpay/sdk", () => {
  it("creates a checkout URL, payment URI, and route decision", () => {
    const client = new ZkpayClient({
      baseUrl: "https://checkout.zkpay.local",
    });

    const payment = client.createPayment(
      {
        amount: "20",
        coin: "USDC",
        receiver: "0x84f",
        label: "API credits",
        metadata: {
          orderId: "ord_123",
        },
      },
      {
        id: "zkp_sdk123",
        nonce: "nonce_sdk123",
        now: "2026-05-25T00:00:00.000Z",
      },
    );

    expect(payment.checkoutUrl).toContain(
      "https://checkout.zkpay.local/pay/zkp_sdk123",
    );
    expect(payment.paymentUri).toContain("zkpay://payment/zkp_sdk123");
    expect(payment.gasRoute.kind).toBe("gasless-stablecoin");
    expect(client.parseCheckoutUrl(payment.checkoutUrl)).toEqual(
      payment.intent,
    );
    expect(client.parsePaymentUri(payment.paymentUri)).toEqual(payment.intent);
  });

  it("verifies payment receipts through the client", () => {
    const client = new ZkpayClient();
    const payment = client.createPayment(
      {
        amount: "20",
        coin: "USDC",
        receiver: "0x84f",
        label: "API credits",
      },
      {
        id: "zkp_receipt123",
        nonce: "nonce_receipt123",
        now: "2026-05-25T00:00:00.000Z",
      },
    );

    const receipt: PaymentReceipt = {
      paymentId: payment.intent.id,
      status: "succeeded",
      txDigest: "9T9T9T9T9T9T9T9T",
      amount: payment.intent.amount,
      coin: payment.intent.coin,
      receiver: payment.intent.receiver,
      nonce: payment.intent.nonce,
      settledAt: "2026-05-25T01:00:00.000Z",
    };

    expect(client.verifyPayment(payment.intent, receipt)).toEqual({
      ok: true,
      errors: [],
    });
  });
});
