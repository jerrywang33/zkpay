import { describe, expect, it } from "vitest";
import {
  SuiReceiptVerifier,
  ZkpayClient,
  buildSuiPaymentTransaction,
  decimalToAtomicAmount,
  type PaymentIntent,
  type PaymentReceipt,
  type SuiRpcClient,
} from "./index.js";

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

  it("converts decimal Sui payment amounts into atomic units", () => {
    expect(decimalToAtomicAmount("20", 6)).toBe("20000000");
    expect(decimalToAtomicAmount("0.25", 6)).toBe("250000");
    expect(() => decimalToAtomicAmount("0.0000001", 6)).toThrow();
  });

  it("builds a Sui payment transaction for wallet submission", () => {
    const intent = makeSuiIntent();
    const built = buildSuiPaymentTransaction({
      intent,
      payer: "0x1111111111111111111111111111111111111111111111111111111111111111",
      coinType: "0x2::usdc::USDC",
      decimals: 6,
      gasBudget: 10_000_000,
    });

    expect(built.amountAtomic).toBe("20000000");
    expect(built.coinType).toBe("0x2::usdc::USDC");
    expect(built.receiver).toBe(intent.receiver);
    expect(built.transaction.getData().sender).toBe(
      "0x1111111111111111111111111111111111111111111111111111111111111111",
    );
    expect(built.transaction.getData().commands).toHaveLength(2);
  });

  it("verifies Sui settlement from transaction balance changes", async () => {
    const intent = makeSuiIntent();
    const verifier = new SuiReceiptVerifier({
      client: makeSuiClient({
        receiverAmount: "20000000",
        senderAmount: "-20000000",
      }),
    });

    const result = await verifier.verify({
      intent,
      txDigest: "H2jbnwW7j5T9s2YRJrZupaymentdigest",
      coinType: "0x2::usdc::USDC",
      expectedSender:
        "0x1111111111111111111111111111111111111111111111111111111111111111",
    });

    expect(result.ok).toBe(true);
    expect(result.receipt).toMatchObject({
      paymentId: intent.id,
      status: "succeeded",
      txDigest: "H2jbnwW7j5T9s2YRJrZupaymentdigest",
      amount: "20",
      coin: "USDC",
      receiver: intent.receiver,
      nonce: intent.nonce,
    });
    expect(result.tx?.receiverDelta).toBe("20000000");
  });

  it("rejects Sui settlement when the receiver amount does not match", async () => {
    const intent = makeSuiIntent();
    const verifier = new SuiReceiptVerifier({
      client: makeSuiClient({
        receiverAmount: "19000000",
        senderAmount: "-19000000",
      }),
    });

    const result = await verifier.verify({
      intent,
      txDigest: "H2jbnwW7j5T9s2YRJrZupaymentdigest",
      coinType: "0x2::usdc::USDC",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("amount_mismatch");
    expect(result.verification?.errors).toContain("receipt_not_succeeded");
  });

  it("returns a typed error when symbolic coins do not include a coin type", async () => {
    const verifier = new SuiReceiptVerifier({
      client: makeSuiClient({
        receiverAmount: "20000000",
        senderAmount: "-20000000",
      }),
    });

    await expect(
      verifier.verify({
        intent: makeSuiIntent(),
        txDigest: "H2jbnwW7j5T9s2YRJrZupaymentdigest",
      }),
    ).resolves.toMatchObject({
      ok: false,
      errors: ["coin_type_missing"],
    });
  });
});

function makeSuiIntent(): PaymentIntent {
  return {
    id: "zkp_sui123",
    amount: "20",
    coin: "USDC",
    receiver:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    label: "API credits",
    metadata: {
      orderId: "ord_123",
    },
    nonce: "nonce_sui123",
    createdAt: "2026-05-25T00:00:00.000Z",
  };
}

function makeSuiClient({
  receiverAmount,
  senderAmount,
}: {
  receiverAmount: string;
  senderAmount: string;
}): SuiRpcClient {
  return {
    async getCoinMetadata() {
      return {
        id: null,
        decimals: 6,
        name: "Test USDC",
        symbol: "USDC",
        description: "Test coin",
        iconUrl: null,
      };
    },
    async getTransactionBlock(input) {
      return {
        digest: input.digest,
        timestampMs: "1770000000000",
        effects: {
          status: {
            status: "success",
          },
        },
        balanceChanges: [
          {
            coinType: "0x2::usdc::USDC",
            owner: {
              AddressOwner:
                "0x2222222222222222222222222222222222222222222222222222222222222222",
            },
            amount: receiverAmount,
          },
          {
            coinType: "0x2::usdc::USDC",
            owner: {
              AddressOwner:
                "0x1111111111111111111111111111111111111111111111111111111111111111",
            },
            amount: senderAmount,
          },
        ],
      } as Awaited<ReturnType<SuiRpcClient["getTransactionBlock"]>>;
    },
  };
}
