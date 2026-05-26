import { describe, expect, it } from "vitest";
import { createZkpayApi, type SuiVerifier } from "./index.js";

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

  it("creates Sui checkout URLs with runtime options", async () => {
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
        },
        options: {
          checkout: {
            network: "testnet",
            coinType: "0x2::usdc::USDC",
            decimals: 6,
            bindingPackageId: "0xabc",
          },
        },
      }),
    });
    const json = await response.json();
    const checkoutUrl = new URL(json.checkoutUrl);

    expect(response.status).toBe(201);
    expect(checkoutUrl.searchParams.get("coinType")).toBe("0x2::usdc::USDC");
    expect(checkoutUrl.searchParams.get("bindingPackageId")).toBe("0xabc");
    expect(json.gasRoute.kind).toBe("sponsored");
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
    let capturedBinding: unknown;
    const app = createZkpayApi({
      suiVerifier: {
        async verify(input) {
          capturedBinding = input.binding;

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
        binding: {
          packageId: "0xabc",
        },
      }),
    });

    expect(verifyResponse.status).toBe(200);
    expect(capturedBinding).toEqual({
      packageId: "0xabc",
    });
    expect(await verifyResponse.json()).toMatchObject({
      ok: true,
      replay: {
        ok: true,
      },
      receipt: {
        paymentId: payment.intent.id,
        txDigest: "H2jbnwW7j5T9s2YRJrZupaymentdigest",
      },
    });
  });

  it("rejects a repeated Sui digest after successful verification", async () => {
    const app = createZkpayApi({
      suiVerifier: makeSuccessfulSuiVerifier(),
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
    const request = {
      intent: payment.intent,
      txDigest: "H2jbnwW7j5T9s2YRJrZupaymentdigest",
      coinType: "0x2::usdc::USDC",
      decimals: 6,
      expectedSender: "0xpayer",
    };

    const firstResponse = await app.request("/payments/verify/sui", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });
    const secondResponse = await app.request("/payments/verify/sui", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(409);
    expect(await secondResponse.json()).toMatchObject({
      ok: false,
      errors: ["digest_already_used"],
      replay: {
        ok: false,
        reason: "digest_already_used",
        existing: {
          paymentId: payment.intent.id,
          txDigest: request.txDigest,
        },
      },
    });
  });

  it("rejects a second Sui digest for an already settled payment", async () => {
    const app = createZkpayApi({
      suiVerifier: makeSuccessfulSuiVerifier(),
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

    const firstResponse = await app.request("/payments/verify/sui", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        intent: payment.intent,
        txDigest: "H2jbnwW7j5T9s2YRJrZupaymentdigestA",
        coinType: "0x2::usdc::USDC",
        decimals: 6,
      }),
    });
    const secondResponse = await app.request("/payments/verify/sui", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        intent: payment.intent,
        txDigest: "H2jbnwW7j5T9s2YRJrZupaymentdigestB",
        coinType: "0x2::usdc::USDC",
        decimals: 6,
      }),
    });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(409);
    expect(await secondResponse.json()).toMatchObject({
      ok: false,
      errors: ["payment_already_settled"],
      replay: {
        ok: false,
        reason: "payment_already_settled",
        existing: {
          paymentId: payment.intent.id,
          txDigest: "H2jbnwW7j5T9s2YRJrZupaymentdigestA",
        },
        attempted: {
          paymentId: payment.intent.id,
          txDigest: "H2jbnwW7j5T9s2YRJrZupaymentdigestB",
        },
      },
    });
  });

  it("can disable the in-process Sui replay guard", async () => {
    const app = createZkpayApi({
      replayStore: false,
      suiVerifier: makeSuccessfulSuiVerifier(),
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
    const request = {
      intent: payment.intent,
      txDigest: "H2jbnwW7j5T9s2YRJrZupaymentdigest",
      coinType: "0x2::usdc::USDC",
      decimals: 6,
    };

    const firstResponse = await app.request("/payments/verify/sui", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });
    const secondResponse = await app.request("/payments/verify/sui", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(await secondResponse.json()).not.toHaveProperty("replay");
  });
});

function makeSuccessfulSuiVerifier(): SuiVerifier {
  return {
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
  };
}
