import { describe, expect, it } from "vitest";
import {
  buildHostedCheckoutUrl,
  canonicalizePaymentIntent,
  canonicalizeWebhookEvent,
  createSignedPaymentIntent,
  createPaymentIntent,
  createWebhookEvent,
  findGaslessStablecoinAsset,
  formatPaymentUri,
  isPaymentIntentExpired,
  parseHostedCheckoutRequest,
  parseHostedCheckoutUrl,
  parsePaymentUri,
  resolveGasRoute,
  signPaymentIntent,
  signWebhookEvent,
  verifyPaymentIntentSignature,
  verifyPaymentReceipt,
  verifyWebhookSignature,
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

  it("round-trips signed hosted checkout requests", () => {
    const intent = makeIntent();
    const signature = signPaymentIntent(intent, "merchant_secret");
    const checkoutUrl = buildHostedCheckoutUrl("https://zkpay.sh", intent, {
      signature,
    });

    expect(parseHostedCheckoutRequest(checkoutUrl)).toEqual({
      intent,
      signature,
    });
    expect(
      verifyPaymentIntentSignature(intent, signature, "merchant_secret"),
    ).toBe(true);
    expect(
      verifyPaymentIntentSignature(
        { ...intent, amount: "21" },
        signature,
        "merchant_secret",
      ),
    ).toBe(false);
  });

  it("canonicalizes payment intents before signing", () => {
    const intent = makeIntent({
      metadata: {
        z: "last",
        a: "first",
      },
    });
    const signed = createSignedPaymentIntent(intent, "merchant_secret");

    expect(canonicalizePaymentIntent(intent)).toBe(
      '{"amount":"20","coin":"USDC","createdAt":"2026-05-25T00:00:00.000Z","expiresAt":"2026-05-26T00:00:00.000Z","id":"zkp_test123","label":"API credits","metadata":{"a":"first","z":"last"},"nonce":"nonce_test123","receiver":"0x84f"}',
    );
    expect(signed.algorithm).toBe("hmac-sha256");
    expect(signed.signature).toHaveLength(43);
  });

  it("signs and verifies webhook events", () => {
    const intent = makeIntent();
    const receipt = makeReceipt(intent);
    const event = createWebhookEvent(
      {
        type: "payment.succeeded",
        paymentId: intent.id,
        intent,
        receipt,
        data: {
          orderId: "ord_123",
        },
      },
      {
        id: "zkw_test123",
        now: "2026-05-25T01:01:00.000Z",
      },
    );
    const signature = signWebhookEvent(event, "webhook_secret", {
      timestamp: 1_779_664_860,
    });

    expect(canonicalizeWebhookEvent(event)).toContain(
      '"type":"payment.succeeded"',
    );
    expect(signature).toMatch(/^t=1779664860,v1=/);
    expect(
      verifyWebhookSignature(event, signature, "webhook_secret", {
        now: 1_779_664_870_000,
      }),
    ).toBe(true);
    expect(
      verifyWebhookSignature(
        { ...event, paymentId: "zkp_other123" },
        signature,
        "webhook_secret",
        {
          now: 1_779_664_870_000,
        },
      ),
    ).toBe(false);
  });

  it("rejects stale webhook signatures", () => {
    const intent = makeIntent();
    const event = createWebhookEvent(
      {
        type: "payment.updated",
        paymentId: intent.id,
        intent,
      },
      {
        id: "zkw_test124",
        now: "2026-05-25T01:01:00.000Z",
      },
    );
    const signature = signWebhookEvent(event, "webhook_secret", {
      timestamp: 1_779_664_000,
    });

    expect(
      verifyWebhookSignature(event, signature, "webhook_secret", {
        now: 1_779_665_000_000,
        toleranceSeconds: 300,
      }),
    ).toBe(false);
  });

  it("adds Sui checkout runtime parameters to hosted checkout URLs", () => {
    const intent = makeIntent();
    const checkoutUrl = buildHostedCheckoutUrl("https://zkpay.sh", intent, {
      network: "testnet",
      coinType: "0x2::usdc::USDC",
      decimals: 6,
      rpcUrl: "https://fullnode.testnet.sui.io",
      bindingPackageId: "0xabc",
      bindingEventType: "0xabc::receipt::PaymentBound",
    });
    const url = new URL(checkoutUrl);

    expect(parseHostedCheckoutUrl(checkoutUrl)).toEqual(intent);
    expect(url.searchParams.get("network")).toBe("testnet");
    expect(url.searchParams.get("coinType")).toBe("0x2::usdc::USDC");
    expect(url.searchParams.get("decimals")).toBe("6");
    expect(url.searchParams.get("rpcUrl")).toBe(
      "https://fullnode.testnet.sui.io",
    );
    expect(url.searchParams.get("bindingPackageId")).toBe("0xabc");
    expect(url.searchParams.get("bindingEventType")).toBe(
      "0xabc::receipt::PaymentBound",
    );
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

  it("routes gasless stablecoin transfers with a network coin registry", () => {
    expect(
      resolveGasRoute({
        intent: makeIntent({ coin: "USDC" }),
        network: "testnet",
        coinType: "0x2::usdc::USDC",
        decimals: 6,
        gaslessStablecoins: [
          {
            symbol: "USDC",
            network: "testnet",
            coinType: "0x2::usdc::USDC",
            decimals: 6,
          },
        ],
      }),
    ).toEqual({
      kind: "gasless-stablecoin",
      payerGas: "zero",
      reason: "eligible-stablecoin-transfer",
    });
  });

  it("does not route mismatched registry entries as gasless", () => {
    expect(
      resolveGasRoute({
        intent: makeIntent({ coin: "USDC" }),
        network: "mainnet",
        coinType: "0x2::usdc::USDC",
        decimals: 6,
        sponsorEnabled: true,
        gaslessStablecoins: [
          {
            symbol: "USDC",
            network: "testnet",
            coinType: "0x2::usdc::USDC",
            decimals: 6,
          },
        ],
      }),
    ).toEqual({
      kind: "sponsored",
      payerGas: "sponsored",
      reason: "stablecoin-not-supported-for-gasless",
    });
  });

  it("finds gasless stablecoins by symbol or coin type", () => {
    const registry = [
      {
        symbol: "USDC",
        network: "testnet" as const,
        coinType: "0x2::usdc::USDC",
        decimals: 6,
      },
    ];

    expect(
      findGaslessStablecoinAsset({
        coin: "USDC",
        network: "testnet",
        registry,
      }),
    ).toEqual(registry[0]);
    expect(
      findGaslessStablecoinAsset({
        coin: "0x2::usdc::USDC",
        network: "testnet",
        registry,
      }),
    ).toEqual(registry[0]);
    expect(
      findGaslessStablecoinAsset({
        coin: "USDC",
        network: "testnet",
        coinType: "0x2::usdc::WRONG",
        registry,
      }),
    ).toBeNull();
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
