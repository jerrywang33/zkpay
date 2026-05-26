import { describe, expect, it } from "vitest";
import { createZkpayApi } from "./index.js";

describe("@zkpay/api", () => {
  it("creates payments through the HTTP boundary", async () => {
    const app = createZkpayApi({
      baseUrl: "https://zkpay.sh",
    });

    const response = await app.request("/payments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        payment: {
          amount: "20",
          coin: "USDC",
          receiver: "0x84f",
          label: "API credits",
          metadata: {
            orderId: "ord_123",
          },
        },
      }),
    });

    expect(response.status).toBe(201);

    const json = await response.json();
    expect(json.intent.id).toMatch(/^zkp_/);
    expect(json.checkoutUrl).toContain("https://zkpay.sh/pay/");
    expect(json.gasRoute.kind).toBe("gasless-stablecoin");
  });

  it("verifies receipts through the HTTP boundary", async () => {
    const app = createZkpayApi();
    const createResponse = await app.request("/payments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        payment: {
          amount: "20",
          coin: "USDC",
          receiver: "0x84f",
          label: "API credits",
        },
      }),
    });
    const payment = await createResponse.json();

    const verifyResponse = await app.request("/payments/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        intent: payment.intent,
        receipt: {
          paymentId: payment.intent.id,
          status: "succeeded",
          txDigest: "9T9T9T9T9T9T9T9T",
          amount: payment.intent.amount,
          coin: payment.intent.coin,
          receiver: payment.intent.receiver,
          nonce: payment.intent.nonce,
          settledAt: "2026-05-25T01:00:00.000Z",
        },
      }),
    });

    expect(verifyResponse.status).toBe(200);
    expect(await verifyResponse.json()).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("verifies Sui settlement through the HTTP boundary", async () => {
    const app = createZkpayApi({
      suiVerifier: {
        async verify(input) {
          return {
            ok: true,
            errors: [],
            warnings: [],
            receipt: {
              paymentId: input.intent.id,
              status: "succeeded",
              txDigest: input.txDigest,
              amount: input.intent.amount,
              coin: input.intent.coin,
              receiver: input.intent.receiver,
              nonce: input.intent.nonce,
              settledAt: "2026-05-25T01:00:00.000Z",
            },
            verification: {
              ok: true,
              errors: [],
            },
          };
        },
      },
    });
    const createResponse = await app.request("/payments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        payment: {
          amount: "20",
          coin: "USDC",
          receiver: "0x84f",
          label: "API credits",
        },
      }),
    });
    const payment = await createResponse.json();

    const verifyResponse = await app.request("/payments/verify/sui", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        intent: payment.intent,
        txDigest: "H2jbnwW7j5T9s2YRJrZupaymentdigest",
        coinType: "0x2::usdc::USDC",
        decimals: 6,
        expectedSender: "0xpayer",
      }),
    });

    expect(verifyResponse.status).toBe(200);
    expect(await verifyResponse.json()).toMatchObject({
      ok: true,
      receipt: {
        paymentId: payment.intent.id,
        txDigest: "H2jbnwW7j5T9s2YRJrZupaymentdigest",
      },
    });
  });
});
