import { describe, expect, it } from "vitest";
import {
  SuiReceiptVerifier,
  ZkpayClient,
  buildSuiPaymentTransaction,
  addSuiPaymentBinding,
  decimalToAtomicAmount,
  type PaymentIntent,
  type PaymentReceipt,
  type SuiRpcClient,
} from "./index.js";

describe("@zkpay/sdk", () => {
  const bindingEventType =
    "0x0000000000000000000000000000000000000000000000000000000000000abc::receipt::PaymentBound";

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

  it("creates Sui checkout URLs with runtime parameters", () => {
    const client = new ZkpayClient({
      baseUrl: "https://checkout.zkpay.local",
    });

    const payment = client.createPayment(
      {
        amount: "20",
        coin: "USDC",
        receiver: "0x84f",
        label: "API credits",
      },
      {
        id: "zkp_sui_url123",
        nonce: "nonce_sui_url123",
        now: "2026-05-25T00:00:00.000Z",
        checkout: {
          network: "testnet",
          coinType: "0x2::usdc::USDC",
          decimals: 6,
          bindingPackageId: "0xabc",
        },
      },
    );
    const checkoutUrl = new URL(payment.checkoutUrl);

    expect(checkoutUrl.searchParams.get("network")).toBe("testnet");
    expect(checkoutUrl.searchParams.get("coinType")).toBe("0x2::usdc::USDC");
    expect(checkoutUrl.searchParams.get("decimals")).toBe("6");
    expect(checkoutUrl.searchParams.get("bindingPackageId")).toBe("0xabc");
    expect(payment.gasRoute.kind).toBe("sponsored");
    expect(payment.gasRoute.reason).toBe("programmable-checkout-requires-sponsor");
    expect(client.parseCheckoutUrl(payment.checkoutUrl)).toEqual(payment.intent);
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

  it("can append a zkpay payment binding event call", () => {
    const intent = makeSuiIntent();
    const built = buildSuiPaymentTransaction({
      intent,
      payer: "0x1111111111111111111111111111111111111111111111111111111111111111",
      coinType: "0x2::usdc::USDC",
      decimals: 6,
      binding: {
        packageId: "0xabc",
      },
    });

    expect(built.bindingEventType).toBe(bindingEventType);
    expect(built.transaction.getData().commands).toHaveLength(3);
    expect(built.transaction.getData().commands[2]).toMatchObject({
      MoveCall: {
        package:
          "0x0000000000000000000000000000000000000000000000000000000000000abc",
        module: "receipt",
        function: "bind",
      },
    });
  });

  it("can append a zkpay payment binding event call to an existing transaction", () => {
    const intent = makeSuiIntent();
    const built = buildSuiPaymentTransaction({
      intent,
      payer: "0x1111111111111111111111111111111111111111111111111111111111111111",
      coinType: "0x2::usdc::USDC",
      decimals: 6,
    });
    const eventType = addSuiPaymentBinding({
      transaction: built.transaction,
      intent,
      amountAtomic: built.amountAtomic,
      coinType: built.coinType,
      packageId: "0xabc",
    });

    expect(eventType).toBe(bindingEventType);
    expect(built.transaction.getData().commands).toHaveLength(3);
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

  it("verifies Sui settlement with an onchain zkpay binding event", async () => {
    const intent = makeSuiIntent();
    const verifier = new SuiReceiptVerifier({
      client: makeSuiClient({
        receiverAmount: "20000000",
        senderAmount: "-20000000",
        event: {
          packageId: "0xabc",
          payer:
            "0x1111111111111111111111111111111111111111111111111111111111111111",
          receiver: intent.receiver,
          amountAtomic: "20000000",
          coinType: "0x2::usdc::USDC",
          paymentId: intent.id,
          nonce: intent.nonce,
        },
      }),
    });

    const result = await verifier.verify({
      intent,
      txDigest: "H2jbnwW7j5T9s2YRJrZupaymentdigest",
      coinType: "0x2::usdc::USDC",
      expectedSender:
        "0x1111111111111111111111111111111111111111111111111111111111111111",
      binding: {
        packageId: "0xabc",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.tx?.bindingEventType).toBe(bindingEventType);
  });

  it("rejects Sui settlement when the binding event does not match", async () => {
    const intent = makeSuiIntent();
    const verifier = new SuiReceiptVerifier({
      client: makeSuiClient({
        receiverAmount: "20000000",
        senderAmount: "-20000000",
        event: {
          packageId: "0xabc",
          payer:
            "0x1111111111111111111111111111111111111111111111111111111111111111",
          receiver: intent.receiver,
          amountAtomic: "20000000",
          coinType: "0x2::usdc::USDC",
          paymentId: "zkp_other",
          nonce: intent.nonce,
        },
      }),
    });

    const result = await verifier.verify({
      intent,
      txDigest: "H2jbnwW7j5T9s2YRJrZupaymentdigest",
      coinType: "0x2::usdc::USDC",
      expectedSender:
        "0x1111111111111111111111111111111111111111111111111111111111111111",
      binding: {
        packageId: "0xabc",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("binding_event_mismatch");
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
  event,
}: {
  receiverAmount: string;
  senderAmount: string;
  event?: {
    packageId: string;
    payer: string;
    receiver: string;
    amountAtomic: string;
    coinType: string;
    paymentId: string;
    nonce: string;
  };
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
        events: event
          ? [
              {
                id: {
                  txDigest: input.digest,
                  eventSeq: "0",
                },
                packageId: event.packageId,
                transactionModule: "receipt",
                sender: event.payer,
                type:
                  "0x0000000000000000000000000000000000000000000000000000000000000abc::receipt::PaymentBound",
                parsedJson: {
                  payer: event.payer,
                  receiver: event.receiver,
                  amount_atomic: event.amountAtomic,
                  coin_type: event.coinType,
                  payment_id: event.paymentId,
                  nonce: event.nonce,
                },
                bcs: "",
                bcsEncoding: "base64",
              },
            ]
          : [],
      } as Awaited<ReturnType<SuiRpcClient["getTransactionBlock"]>>;
    },
  };
}
