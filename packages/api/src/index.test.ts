import { describe, expect, it } from "vitest";
import { ZkpayClient } from "@zkpay/sdk";
import {
  InMemoryWebhookDeliveryStore,
  createD1SuiReplayStore,
  createD1SuiReplayStoreSchema,
  createD1WebhookDeliveryStore,
  createD1WebhookDeliveryStoreSchema,
  createHttpWebhookDispatcher,
  createZkpayApi,
  type D1DatabaseLike,
  type D1PreparedStatementLike,
  type SuiReplayRecord,
  type SuiVerifier,
  type WebhookDeliveryRecord,
  type WebhookDispatcher,
} from "./index.js";

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

  it("adds signed webhook events after successful receipt verification", async () => {
    const webhookClient = new ZkpayClient({
      webhookSecret: "webhook_secret",
    });
    const app = createZkpayApi({
      webhookSecret: "webhook_secret",
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
    const receipt = {
      paymentId: payment.intent.id,
      status: "succeeded",
      txDigest: "9T9T9T9T9T9T9T9T",
      amount: payment.intent.amount,
      coin: payment.intent.coin,
      receiver: payment.intent.receiver,
      nonce: payment.intent.nonce,
      settledAt: "2026-05-25T01:00:00.000Z",
    };

    const verifyResponse = await app.request("/payments/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        intent: payment.intent,
        receipt,
      }),
    });
    const json = await verifyResponse.json();

    expect(verifyResponse.status).toBe(200);
    expect(json.webhook.event).toMatchObject({
      type: "payment.succeeded",
      paymentId: payment.intent.id,
      data: {
        source: "payments.verify",
      },
    });
    expect(json.webhook.signatureHeader).toMatch(/^t=\d+,v1=/);
    expect(
      webhookClient.verifyWebhookSignature(
        json.webhook.event,
        json.webhook.signatureHeader,
      ),
    ).toBe(true);
  });

  it("dispatches signed webhook events when configured", async () => {
    let capturedSignature: string | undefined;
    let capturedPaymentId: string | undefined;
    const deliveryStore = new InMemoryWebhookDeliveryStore();
    const dispatcher: WebhookDispatcher = {
      async dispatch(webhook) {
        capturedSignature = webhook.signatureHeader;
        capturedPaymentId = webhook.event.paymentId;

        return [
          {
            ok: true,
            url: "https://merchant.example/webhooks/zkpay",
            status: 202,
            attemptCount: 1,
            completedAt: "2026-05-25T01:02:00.000Z",
          },
        ];
      },
    };
    const app = createZkpayApi({
      webhookSecret: "webhook_secret",
      webhookDispatcher: dispatcher,
      webhookDeliveryStore: deliveryStore,
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
    const json = await verifyResponse.json();

    expect(verifyResponse.status).toBe(200);
    expect(capturedSignature).toBe(json.webhook.signatureHeader);
    expect(capturedPaymentId).toBe(payment.intent.id);
    expect(json.webhookDelivery).toEqual([
      {
        ok: true,
        url: "https://merchant.example/webhooks/zkpay",
        status: 202,
        attemptCount: 1,
        completedAt: "2026-05-25T01:02:00.000Z",
      },
    ]);
    expect(json.webhookDeliveryLog).toMatchObject({
      ok: true,
      recordCount: 1,
    });
    expect(deliveryStore.records).toEqual([
      {
        eventId: json.webhook.event.id,
        paymentId: payment.intent.id,
        eventType: "payment.succeeded",
        targetUrl: "https://merchant.example/webhooks/zkpay",
        ok: true,
        status: 202,
        attemptCount: 1,
        completedAt: "2026-05-25T01:02:00.000Z",
      },
    ]);

    const deliveryListResponse = await app.request(
      `/webhooks/deliveries?paymentId=${payment.intent.id}`,
    );
    const deliveryListJson = await deliveryListResponse.json();

    expect(deliveryListResponse.status).toBe(200);
    expect(deliveryListJson.deliveries).toEqual(deliveryStore.records);
  });

  it("returns unavailable when webhook delivery logs are not configured", async () => {
    const app = createZkpayApi();
    const response = await app.request("/webhooks/deliveries");
    const json = await response.json();

    expect(response.status).toBe(501);
    expect(json).toEqual({
      error: "webhook_delivery_store_unavailable",
    });
  });

  it("rejects invalid webhook delivery list queries", async () => {
    const app = createZkpayApi({
      webhookDeliveryStore: new InMemoryWebhookDeliveryStore(),
    });
    const response = await app.request("/webhooks/deliveries?limit=0");
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("invalid_webhook_delivery_query");
  });

  it("records webhook delivery results with a D1 adapter", async () => {
    const database = new FakeD1Database();
    const dispatcher: WebhookDispatcher = {
      async dispatch() {
        return [
          {
            ok: false,
            url: "https://merchant.example/webhooks/zkpay",
            status: 500,
            attemptCount: 3,
            error: "HTTP 500",
            completedAt: "2026-05-25T01:02:00.000Z",
          },
        ];
      },
    };
    const app = createZkpayApi({
      webhookSecret: "webhook_secret",
      webhookDispatcher: dispatcher,
      webhookDeliveryStore: createD1WebhookDeliveryStore(database),
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
    const json = await verifyResponse.json();

    expect(verifyResponse.status).toBe(200);
    expect(json.webhookDeliveryLog).toMatchObject({
      ok: true,
      recordCount: 1,
    });
    expect(database.webhookDeliveryRecords).toEqual([
      {
        eventId: json.webhook.event.id,
        paymentId: payment.intent.id,
        eventType: "payment.succeeded",
        targetUrl: "https://merchant.example/webhooks/zkpay",
        ok: false,
        status: 500,
        attemptCount: 3,
        error: "HTTP 500",
        completedAt: "2026-05-25T01:02:00.000Z",
      },
    ]);

    const deliveryListResponse = await app.request(
      `/webhooks/deliveries?eventId=${json.webhook.event.id}&limit=5`,
    );
    const deliveryListJson = await deliveryListResponse.json();

    expect(deliveryListResponse.status).toBe(200);
    expect(deliveryListJson.deliveries).toEqual(database.webhookDeliveryRecords);
  });

  it("creates an HTTP webhook dispatcher", async () => {
    const webhookClient = new ZkpayClient({
      webhookSecret: "webhook_secret",
    });
    const event = webhookClient.createWebhookEvent(
      {
        type: "payment.succeeded",
        paymentId: "zkp_dispatch123",
        data: {
          source: "test",
        },
      },
      {
        id: "zkw_dispatch123",
        now: "2026-05-25T01:01:00.000Z",
      },
    );
    const signatureHeader = webhookClient.signWebhookEvent(
      event,
      undefined,
      {
        timestamp: 1_779_664_860,
      },
    );
    let capturedUrl: string | URL | Request | undefined;
    let capturedInit: RequestInit | undefined;
    const dispatcher = createHttpWebhookDispatcher({
      targets: [
        {
          url: "https://merchant.example/webhooks/zkpay",
          headers: {
            "x-merchant": "demo",
          },
        },
      ],
      retry: {
        attempts: 1,
      },
      fetch: async (url, init) => {
        capturedUrl = url;
        capturedInit = init;

        return {
          ok: true,
          status: 202,
        } as Response;
      },
    });

    const results = await dispatcher.dispatch({
      event,
      signatureHeader,
    });

    expect(results).toMatchObject([
      {
        ok: true,
        url: "https://merchant.example/webhooks/zkpay",
        status: 202,
        attemptCount: 1,
      },
    ]);
    expect(capturedUrl).toBe("https://merchant.example/webhooks/zkpay");
    expect(capturedInit?.method).toBe("POST");
    expect(capturedInit?.headers).toMatchObject({
      "content-type": "application/json",
      "zkpay-signature": signatureHeader,
      "x-merchant": "demo",
    });
    expect(JSON.parse(String(capturedInit?.body))).toMatchObject({
      id: "zkw_dispatch123",
      paymentId: "zkp_dispatch123",
    });
  });

  it("can require signed payment intents at the HTTP boundary", async () => {
    const app = createZkpayApi({
      signingSecret: "merchant_secret",
      requireIntentSignature: true,
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
    const receipt = {
      paymentId: payment.intent.id,
      status: "succeeded",
      txDigest: "9T9T9T9T9T9T9T9T",
      amount: payment.intent.amount,
      coin: payment.intent.coin,
      receiver: payment.intent.receiver,
      nonce: payment.intent.nonce,
      settledAt: "2026-05-25T01:00:00.000Z",
    };

    const missingSignatureResponse = await app.request("/payments/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        intent: payment.intent,
        receipt,
      }),
    });
    const signedResponse = await app.request("/payments/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        intent: payment.intent,
        signature: payment.signature,
        receipt,
      }),
    });
    const tamperedResponse = await app.request("/payments/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        intent: {
          ...payment.intent,
          amount: "21",
        },
        signature: payment.signature,
        receipt,
      }),
    });

    expect(payment.signature).toBeTruthy();
    expect(missingSignatureResponse.status).toBe(401);
    expect(await missingSignatureResponse.json()).toEqual({
      error: "payment_intent_signature_missing",
    });
    expect(signedResponse.status).toBe(200);
    expect(tamperedResponse.status).toBe(401);
    expect(await tamperedResponse.json()).toEqual({
      error: "payment_intent_signature_invalid",
    });
  });

  it("verifies Sui settlement through the HTTP boundary", async () => {
    let capturedBinding: unknown;
    const webhookClient = new ZkpayClient({
      webhookSecret: "webhook_secret",
    });
    const app = createZkpayApi({
      webhookSecret: "webhook_secret",
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
    const json = await verifyResponse.json();

    expect(json).toMatchObject({
      ok: true,
      replay: {
        ok: true,
      },
      receipt: {
        paymentId: payment.intent.id,
        txDigest: "H2jbnwW7j5T9s2YRJrZupaymentdigest",
      },
      webhook: {
        event: {
          type: "payment.succeeded",
          paymentId: payment.intent.id,
          data: {
            source: "payments.verify.sui",
          },
        },
      },
    });
    expect(
      webhookClient.verifyWebhookSignature(
        json.webhook.event,
        json.webhook.signatureHeader,
      ),
    ).toBe(true);
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

  it("can use a D1 replay store adapter", async () => {
    const app = createZkpayApi({
      replayStore: createD1SuiReplayStore(new FakeD1Database()),
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
    expect(secondResponse.status).toBe(409);
    expect(await secondResponse.json()).toMatchObject({
      ok: false,
      errors: ["digest_already_used"],
    });
  });

  it("generates D1 replay store schema", () => {
    expect(createD1SuiReplayStoreSchema()).toContain(
      "create table if not exists zkpay_sui_replay",
    );
    expect(createD1SuiReplayStoreSchema({ tableName: "merchant_replay" }))
      .toContain("create table if not exists merchant_replay");
    expect(() =>
      createD1SuiReplayStoreSchema({ tableName: "bad-name" }),
    ).toThrow("Invalid SQL identifier");
  });

  it("generates D1 webhook delivery store schema", () => {
    expect(createD1WebhookDeliveryStoreSchema()).toContain(
      "create table if not exists zkpay_webhook_delivery",
    );
    expect(createD1WebhookDeliveryStoreSchema({ tableName: "merchant_webhooks" }))
      .toContain("create table if not exists merchant_webhooks");
    expect(createD1WebhookDeliveryStoreSchema()).toContain(
      "event_id text not null",
    );
    expect(() =>
      createD1WebhookDeliveryStoreSchema({ tableName: "bad-name" }),
    ).toThrow("Invalid SQL identifier");
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

class FakeD1Database implements D1DatabaseLike {
  readonly records: SuiReplayRecord[] = [];
  readonly webhookDeliveryRecords: WebhookDeliveryRecord[] = [];

  prepare(query: string): D1PreparedStatementLike {
    return new FakeD1PreparedStatement(this, query);
  }
}

class FakeD1PreparedStatement implements D1PreparedStatementLike {
  constructor(
    private readonly database: FakeD1Database,
    private readonly query: string,
    private readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]): D1PreparedStatementLike {
    return new FakeD1PreparedStatement(this.database, this.query, values);
  }

  async first<T = unknown>(): Promise<T | null> {
    const value = String(this.values[0]);
    const record = this.query.includes("where tx_digest")
      ? this.database.records.find((item) => item.txDigest === value)
      : this.database.records.find((item) => item.paymentId === value);

    if (!record) return null;

    return {
      payment_id: record.paymentId,
      tx_digest: record.txDigest,
      amount: record.amount,
      coin: record.coin,
      receiver: record.receiver,
      nonce: record.nonce,
      settled_at: record.settledAt,
      verified_at: record.verifiedAt,
    } as T;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    let records = [...this.database.webhookDeliveryRecords];
    let limit = 50;

    if (this.query.includes("where payment_id = ? and event_id = ?")) {
      const paymentId = String(this.values[0]);
      const eventId = String(this.values[1]);
      limit = Number(this.values[2]);
      records = records.filter(
        (record) =>
          record.paymentId === paymentId && record.eventId === eventId,
      );
    } else if (this.query.includes("where payment_id = ?")) {
      const paymentId = String(this.values[0]);
      limit = Number(this.values[1]);
      records = records.filter((record) => record.paymentId === paymentId);
    } else if (this.query.includes("where event_id = ?")) {
      const eventId = String(this.values[0]);
      limit = Number(this.values[1]);
      records = records.filter((record) => record.eventId === eventId);
    } else {
      limit = Number(this.values[0]);
    }

    const results = records
      .sort((left, right) =>
        right.completedAt.localeCompare(left.completedAt),
      )
      .slice(0, limit)
      .map((record) => ({
        event_id: record.eventId,
        payment_id: record.paymentId,
        event_type: record.eventType,
        target_url: record.targetUrl ?? null,
        ok: record.ok ? 1 : 0,
        status: record.status ?? null,
        attempt_count: record.attemptCount,
        error: record.error ?? null,
        completed_at: record.completedAt,
      }));

    return {
      results: results as T[],
    };
  }

  async run(): Promise<unknown> {
    if (this.values.length === 9) {
      this.database.webhookDeliveryRecords.push({
        eventId: String(this.values[0]),
        paymentId: String(this.values[1]),
        eventType: String(this.values[2]),
        targetUrl:
          this.values[3] === null || this.values[3] === undefined
            ? undefined
            : String(this.values[3]),
        ok: this.values[4] === 1,
        status:
          this.values[5] === null || this.values[5] === undefined
            ? undefined
            : Number(this.values[5]),
        attemptCount: Number(this.values[6]),
        error:
          this.values[7] === null || this.values[7] === undefined
            ? undefined
            : String(this.values[7]),
        completedAt: String(this.values[8]),
      });

      return {
        success: true,
      };
    }

    const record: SuiReplayRecord = {
      paymentId: String(this.values[0]),
      txDigest: String(this.values[1]),
      amount: String(this.values[2]),
      coin: String(this.values[3]),
      receiver: String(this.values[4]),
      nonce: String(this.values[5]),
      settledAt: String(this.values[6]),
      verifiedAt: String(this.values[7]),
    };

    if (
      this.database.records.some(
        (item) =>
          item.paymentId === record.paymentId ||
          item.txDigest === record.txDigest,
      )
    ) {
      throw new Error("D1 unique constraint failed");
    }

    this.database.records.push(record);
    return {
      success: true,
    };
  }
}
