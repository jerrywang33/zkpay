import { describe, expect, it } from "vitest";
import { ZkpayClient } from "@zkpay/sdk";
import {
  InMemoryWebhookDeliveryStore,
  InMemoryWebhookEndpointRegistry,
  createD1SuiReplayStore,
  createD1SuiReplayStoreSchema,
  createD1WebhookEndpointRegistry,
  createD1WebhookEndpointRegistrySchema,
  createD1WebhookDeliveryStore,
  createD1WebhookDeliveryStoreSchema,
  createHttpWebhookDispatcher,
  createZkpayApi,
  type D1DatabaseLike,
  type D1PreparedStatementLike,
  type SuiReplayRecord,
  type SuiVerifier,
  type WebhookDeliveryRecord,
  type WebhookEndpoint,
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

  it("dispatches HTTP webhooks from an endpoint registry", async () => {
    const webhookClient = new ZkpayClient({
      webhookSecret: "webhook_secret",
    });
    const payment = webhookClient.createPayment(
      {
        amount: "20",
        coin: "USDC",
        receiver: "0x84f",
        label: "API credits",
        metadata: {
          merchantId: "merchant_a",
        },
      },
      {
        id: "zkp_registry123",
        nonce: "nonce_registry123",
        now: "2026-05-25T01:00:00.000Z",
      },
    );
    const event = webhookClient.createWebhookEvent(
      {
        type: "payment.succeeded",
        paymentId: payment.intent.id,
        intent: payment.intent,
      },
      {
        id: "zkw_registry123",
        now: "2026-05-25T01:01:00.000Z",
      },
    );
    const signatureHeader = webhookClient.signWebhookEvent(event);
    const capturedUrls: (string | URL | Request)[] = [];
    const registry = new InMemoryWebhookEndpointRegistry([
      {
        id: "global",
        url: "https://merchant.example/webhooks/global",
        eventTypes: ["payment.succeeded"],
      },
      {
        id: "merchant-a",
        merchantId: "merchant_a",
        url: "https://merchant.example/webhooks/a",
        headers: {
          "x-endpoint": "merchant-a",
        },
      },
      {
        id: "merchant-b",
        merchantId: "merchant_b",
        url: "https://merchant.example/webhooks/b",
      },
      {
        id: "disabled",
        url: "https://merchant.example/webhooks/disabled",
        enabled: false,
      },
    ]);
    const dispatcher = createHttpWebhookDispatcher({
      endpointRegistry: registry,
      retry: {
        attempts: 1,
      },
      fetch: async (url) => {
        capturedUrls.push(url);

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
        url: "https://merchant.example/webhooks/global",
        status: 202,
      },
      {
        ok: true,
        url: "https://merchant.example/webhooks/a",
        status: 202,
      },
    ]);
    expect(capturedUrls).toEqual([
      "https://merchant.example/webhooks/global",
      "https://merchant.example/webhooks/a",
    ]);
  });

  it("dispatches HTTP webhooks from a D1 endpoint registry", async () => {
    const database = new FakeD1Database();
    database.webhookEndpoints.push(
      {
        id: "merchant-a",
        merchantId: "merchant_a",
        url: "https://merchant.example/webhooks/a",
        headers: {
          "x-endpoint": "merchant-a",
        },
        eventTypes: ["payment.succeeded"],
        enabled: true,
        createdAt: "2026-05-25T01:00:00.000Z",
        updatedAt: "2026-05-25T01:00:00.000Z",
      },
      {
        id: "merchant-b",
        merchantId: "merchant_b",
        url: "https://merchant.example/webhooks/b",
        enabled: true,
        createdAt: "2026-05-25T01:00:00.000Z",
        updatedAt: "2026-05-25T01:00:00.000Z",
      },
    );
    const webhookClient = new ZkpayClient({
      webhookSecret: "webhook_secret",
    });
    const payment = webhookClient.createPayment(
      {
        amount: "20",
        coin: "USDC",
        receiver: "0x84f",
        label: "API credits",
        metadata: {
          merchantId: "merchant_a",
        },
      },
      {
        id: "zkp_d1registry123",
        nonce: "nonce_d1registry123",
        now: "2026-05-25T01:00:00.000Z",
      },
    );
    const event = webhookClient.createWebhookEvent(
      {
        type: "payment.succeeded",
        paymentId: payment.intent.id,
        intent: payment.intent,
      },
      {
        id: "zkw_d1registry123",
        now: "2026-05-25T01:01:00.000Z",
      },
    );
    let capturedInit: RequestInit | undefined;
    const dispatcher = createHttpWebhookDispatcher({
      endpointRegistry: createD1WebhookEndpointRegistry(database),
      retry: {
        attempts: 1,
      },
      fetch: async (_url, init) => {
        capturedInit = init;

        return {
          ok: true,
          status: 202,
        } as Response;
      },
    });

    const results = await dispatcher.dispatch({
      event,
      signatureHeader: webhookClient.signWebhookEvent(event),
    });

    expect(results).toMatchObject([
      {
        ok: true,
        url: "https://merchant.example/webhooks/a",
        status: 202,
      },
    ]);
    expect(capturedInit?.headers).toMatchObject({
      "x-endpoint": "merchant-a",
    });
  });

  it("manages webhook endpoints with an in-memory store", async () => {
    const endpointStore = new InMemoryWebhookEndpointRegistry();
    const app = createZkpayApi({
      webhookEndpointStore: endpointStore,
    });
    const createResponse = await app.request("/webhooks/endpoints", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: "endpoint_alpha",
        merchantId: "merchant_a",
        url: "https://merchant.example/webhooks/a",
        headers: {
          "x-endpoint": "alpha",
        },
        eventTypes: ["payment.succeeded"],
      }),
    });
    const createJson = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createJson.endpoint).toMatchObject({
      id: "endpoint_alpha",
      merchantId: "merchant_a",
      url: "https://merchant.example/webhooks/a",
      enabled: true,
      eventTypes: ["payment.succeeded"],
    });

    const listResponse = await app.request(
      "/webhooks/endpoints?merchantId=merchant_a&enabled=true",
    );
    const listJson = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listJson.endpoints).toEqual([createJson.endpoint]);

    const patchResponse = await app.request(
      "/webhooks/endpoints/endpoint_alpha",
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          enabled: false,
          headers: null,
        }),
      },
    );
    const patchJson = await patchResponse.json();

    expect(patchResponse.status).toBe(200);
    expect(patchJson.endpoint).toMatchObject({
      id: "endpoint_alpha",
      enabled: false,
    });
    expect(patchJson.endpoint).not.toHaveProperty("headers");
  });

  it("manages webhook endpoints with a D1 store", async () => {
    const database = new FakeD1Database();
    const endpointStore = createD1WebhookEndpointRegistry(database);
    const app = createZkpayApi({
      webhookEndpointStore: endpointStore,
    });
    const createResponse = await app.request("/webhooks/endpoints", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: "endpoint_d1",
        merchantId: "merchant_d1",
        url: "https://merchant.example/webhooks/d1",
        enabled: true,
      }),
    });
    const createJson = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createJson.endpoint).toMatchObject({
      id: "endpoint_d1",
      merchantId: "merchant_d1",
      enabled: true,
    });

    const patchResponse = await app.request("/webhooks/endpoints/endpoint_d1", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        url: "https://merchant.example/webhooks/d1-v2",
        eventTypes: ["payment.succeeded", "payment.updated"],
      }),
    });
    const patchJson = await patchResponse.json();

    expect(patchResponse.status).toBe(200);
    expect(patchJson.endpoint).toMatchObject({
      id: "endpoint_d1",
      url: "https://merchant.example/webhooks/d1-v2",
      eventTypes: ["payment.succeeded", "payment.updated"],
    });

    const listResponse = await app.request(
      "/webhooks/endpoints?merchantId=merchant_d1&limit=5",
    );
    const listJson = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listJson.endpoints).toEqual([patchJson.endpoint]);
  });

  it("redacts webhook endpoint secrets in management responses", async () => {
    const endpointStore = new InMemoryWebhookEndpointRegistry();
    const app = createZkpayApi({
      webhookEndpointStore: endpointStore,
    });
    const createResponse = await app.request("/webhooks/endpoints", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: "endpoint_secret",
        merchantId: "merchant_secret",
        url: "https://merchant.example/webhooks/secret",
        headers: {
          authorization: "Bearer merchant_secret",
          "x-api-key": "api_secret",
          "x-visible": "ok",
        },
        signingSecret: "endpoint_secret",
      }),
    });
    const createJson = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createJson.endpoint).toMatchObject({
      id: "endpoint_secret",
      hasSigningSecret: true,
      headers: {
        authorization: "[redacted]",
        "x-api-key": "[redacted]",
        "x-visible": "ok",
      },
    });
    expect(createJson.endpoint).not.toHaveProperty("signingSecret");

    const listResponse = await app.request(
      "/webhooks/endpoints?merchantId=merchant_secret",
    );
    const listJson = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listJson.endpoints[0]).toMatchObject({
      id: "endpoint_secret",
      hasSigningSecret: true,
      headers: {
        authorization: "[redacted]",
        "x-api-key": "[redacted]",
        "x-visible": "ok",
      },
    });
    expect(listJson.endpoints[0]).not.toHaveProperty("signingSecret");
  });

  it("uses endpoint signing secrets for registry dispatch", async () => {
    const webhookClient = new ZkpayClient({
      webhookSecret: "global_secret",
    });
    const event = webhookClient.createWebhookEvent(
      {
        type: "payment.succeeded",
        paymentId: "zkp_endpoint_secret",
        data: {
          source: "test",
        },
      },
      {
        id: "zkw_endpoint_secret",
        now: "2026-05-25T01:01:00.000Z",
      },
    );
    const globalSignature = webhookClient.signWebhookEvent(event);
    let capturedInit: RequestInit | undefined;
    const dispatcher = createHttpWebhookDispatcher({
      endpointRegistry: new InMemoryWebhookEndpointRegistry([
        {
          id: "endpoint_signing",
          url: "https://merchant.example/webhooks/signed",
          signingSecret: "endpoint_secret",
        },
      ]),
      retry: {
        attempts: 1,
      },
      fetch: async (_url, init) => {
        capturedInit = init;

        return {
          ok: true,
          status: 202,
        } as Response;
      },
    });

    const results = await dispatcher.dispatch({
      event,
      signatureHeader: globalSignature,
    });
    const headers = capturedInit?.headers as Record<string, string>;

    expect(results).toMatchObject([
      {
        ok: true,
        url: "https://merchant.example/webhooks/signed",
      },
    ]);
    expect(headers["zkpay-signature"]).not.toBe(globalSignature);
    expect(
      webhookClient.verifyWebhookSignature(
        event,
        headers["zkpay-signature"],
        "endpoint_secret",
      ),
    ).toBe(true);
    expect(
      webhookClient.verifyWebhookSignature(
        event,
        headers["zkpay-signature"],
        "global_secret",
      ),
    ).toBe(false);
  });

  it("tests a managed webhook endpoint delivery", async () => {
    const webhookClient = new ZkpayClient();
    const endpointStore = new InMemoryWebhookEndpointRegistry([
      {
        id: "endpoint_test",
        url: "https://merchant.example/webhooks/test",
        signingSecret: "endpoint_secret",
      },
    ]);
    let capturedUrl: string | URL | Request | undefined;
    let capturedInit: RequestInit | undefined;
    const app = createZkpayApi({
      webhookEndpointStore: endpointStore,
      webhookTestFetch: async (url, init) => {
        capturedUrl = url;
        capturedInit = init;

        return {
          ok: true,
          status: 202,
        } as Response;
      },
    });
    const response = await app.request("/webhooks/endpoints/endpoint_test/test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        paymentId: "zkp_endpoint_test",
        data: {
          reason: "manual",
        },
      }),
    });
    const json = await response.json();
    const headers = capturedInit?.headers as Record<string, string>;
    const event = JSON.parse(String(capturedInit?.body));

    expect(response.status).toBe(200);
    expect(capturedUrl).toBe("https://merchant.example/webhooks/test");
    expect(json).toMatchObject({
      endpoint: {
        id: "endpoint_test",
        hasSigningSecret: true,
      },
      delivery: {
        ok: true,
        status: 202,
        attemptCount: 1,
      },
    });
    expect(json.endpoint).not.toHaveProperty("signingSecret");
    expect(event).toMatchObject({
      type: "payment.updated",
      paymentId: "zkp_endpoint_test",
      data: {
        source: "webhooks.endpoints.test",
        endpointId: "endpoint_test",
        reason: "manual",
      },
    });
    expect(
      webhookClient.verifyWebhookSignature(
        event,
        headers["zkpay-signature"],
        "endpoint_secret",
      ),
    ).toBe(true);
  });

  it("requires a signing secret for webhook endpoint test delivery", async () => {
    const app = createZkpayApi({
      webhookEndpointStore: new InMemoryWebhookEndpointRegistry([
        {
          id: "endpoint_unsigned",
          url: "https://merchant.example/webhooks/unsigned",
        },
      ]),
    });
    const response = await app.request(
      "/webhooks/endpoints/endpoint_unsigned/test",
      {
        method: "POST",
      },
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({
      error: "webhook_endpoint_signing_secret_missing",
    });
  });

  it("protects management routes with an optional API key", async () => {
    const endpointStore = new InMemoryWebhookEndpointRegistry();
    const app = createZkpayApi({
      managementApiKey: "management_secret",
      webhookEndpointStore: endpointStore,
    });
    const missingResponse = await app.request("/webhooks/endpoints");
    const invalidResponse = await app.request("/webhooks/endpoints", {
      headers: {
        "x-zkpay-api-key": "wrong_secret",
      },
    });
    const createResponse = await app.request("/webhooks/endpoints", {
      method: "POST",
      headers: {
        authorization: "Bearer management_secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: "endpoint_auth",
        url: "https://merchant.example/webhooks/auth",
      }),
    });
    const createJson = await createResponse.json();

    expect(missingResponse.status).toBe(401);
    expect(await missingResponse.json()).toEqual({
      error: "management_api_key_missing",
    });
    expect(invalidResponse.status).toBe(401);
    expect(await invalidResponse.json()).toEqual({
      error: "management_api_key_invalid",
    });
    expect(createResponse.status).toBe(201);
    expect(createJson.endpoint).toMatchObject({
      id: "endpoint_auth",
    });
  });

  it("accepts rotated management API keys for delivery queries", async () => {
    const deliveryStore = new InMemoryWebhookDeliveryStore();
    deliveryStore.record({
      eventId: "zkw_rotation",
      paymentId: "zkp_rotation",
      eventType: "payment.succeeded",
      ok: true,
      status: 202,
      attemptCount: 1,
      completedAt: "2026-05-25T01:02:00.000Z",
    });
    const app = createZkpayApi({
      managementApiKeys: ["old_secret", "new_secret"],
      webhookDeliveryStore: deliveryStore,
    });
    const response = await app.request("/webhooks/deliveries", {
      headers: {
        "x-zkpay-api-key": "new_secret",
      },
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.deliveries).toHaveLength(1);
    expect(json.deliveries[0]).toMatchObject({
      eventId: "zkw_rotation",
    });
  });

  it("does not apply management API keys to payment creation", async () => {
    const app = createZkpayApi({
      managementApiKey: "management_secret",
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
      }),
    });

    expect(response.status).toBe(201);
  });

  it("returns unavailable when webhook endpoint management is not configured", async () => {
    const app = createZkpayApi();
    const response = await app.request("/webhooks/endpoints");
    const json = await response.json();

    expect(response.status).toBe(501);
    expect(json).toEqual({
      error: "webhook_endpoint_store_unavailable",
    });
  });

  it("returns not found for missing webhook endpoint patches", async () => {
    const app = createZkpayApi({
      webhookEndpointStore: new InMemoryWebhookEndpointRegistry(),
    });
    const response = await app.request("/webhooks/endpoints/missing_endpoint", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        enabled: false,
      }),
    });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json).toEqual({
      error: "webhook_endpoint_not_found",
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

  it("generates D1 webhook endpoint registry schema", () => {
    expect(createD1WebhookEndpointRegistrySchema()).toContain(
      "create table if not exists zkpay_webhook_endpoints",
    );
    expect(
      createD1WebhookEndpointRegistrySchema({ tableName: "merchant_endpoints" }),
    ).toContain("create table if not exists merchant_endpoints");
    expect(createD1WebhookEndpointRegistrySchema()).toContain(
      "event_types_json text",
    );
    expect(createD1WebhookEndpointRegistrySchema()).toContain(
      "signing_secret text",
    );
    expect(() =>
      createD1WebhookEndpointRegistrySchema({ tableName: "bad-name" }),
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
  readonly webhookEndpoints: WebhookEndpoint[] = [];

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
    if (this.query.includes("headers_json")) {
      const endpoint = this.database.webhookEndpoints.find(
        (item) => item.id === String(this.values[0]),
      );

      return endpoint ? (this.toD1WebhookEndpointRow(endpoint) as T) : null;
    }

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
    if (this.query.includes("headers_json")) {
      return {
        results: this.queryWebhookEndpoints() as T[],
      };
    }

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

  private queryWebhookEndpoints(): unknown[] {
    let records = [...this.database.webhookEndpoints];
    let limit: number | undefined;

    if (this.query.includes("enabled = 1 and (merchant_id is null")) {
      const merchantId = String(this.values[0]);
      records = records
        .filter((endpoint) => endpoint.enabled)
        .filter(
          (endpoint) =>
            !endpoint.merchantId || endpoint.merchantId === merchantId,
        );
    } else if (this.query.includes("enabled = 1 and merchant_id is null")) {
      records = records
        .filter((endpoint) => endpoint.enabled)
        .filter((endpoint) => !endpoint.merchantId);
    } else if (this.query.includes("where merchant_id = ? and enabled = ?")) {
      const merchantId = String(this.values[0]);
      const enabled = this.values[1] === 1;
      limit = Number(this.values[2]);
      records = records
        .filter((endpoint) => endpoint.merchantId === merchantId)
        .filter((endpoint) => endpoint.enabled === enabled);
    } else if (this.query.includes("where merchant_id = ?")) {
      const merchantId = String(this.values[0]);
      limit = Number(this.values[1]);
      records = records.filter((endpoint) => endpoint.merchantId === merchantId);
    } else if (this.query.includes("where enabled = ?")) {
      const enabled = this.values[0] === 1;
      limit = Number(this.values[1]);
      records = records.filter((endpoint) => endpoint.enabled === enabled);
    } else {
      limit = Number(this.values[0]);
    }

    records = records.sort((left, right) => {
      const leftTime = left.createdAt ?? "";
      const rightTime = right.createdAt ?? "";
      const timeOrder = this.query.includes("order by created_at desc")
        ? rightTime.localeCompare(leftTime)
        : leftTime.localeCompare(rightTime);

      return timeOrder === 0 ? left.id.localeCompare(right.id) : timeOrder;
    });

    if (Number.isFinite(limit)) {
      records = records.slice(0, limit);
    }

    return records.map((record) => this.toD1WebhookEndpointRow(record));
  }

  private toD1WebhookEndpointRow(record: WebhookEndpoint): unknown {
    return {
      id: record.id,
      merchant_id: record.merchantId ?? null,
      url: record.url,
      headers_json: record.headers
        ? JSON.stringify(record.headers)
        : null,
      event_types_json: record.eventTypes
        ? JSON.stringify(record.eventTypes)
        : null,
      signing_secret: record.signingSecret ?? null,
      enabled: record.enabled ? 1 : 0,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }

  async run(): Promise<unknown> {
    if (this.query.includes("insert into") && this.query.includes("headers_json")) {
      this.database.webhookEndpoints.push({
        id: String(this.values[0]),
        merchantId:
          this.values[1] === null || this.values[1] === undefined
            ? undefined
            : String(this.values[1]),
        url: String(this.values[2]),
        headers:
          this.values[3] === null || this.values[3] === undefined
            ? undefined
            : JSON.parse(String(this.values[3])),
        eventTypes:
          this.values[4] === null || this.values[4] === undefined
            ? undefined
            : JSON.parse(String(this.values[4])),
        signingSecret:
          this.values[5] === null || this.values[5] === undefined
            ? undefined
            : String(this.values[5]),
        enabled: this.values[6] === 1,
        createdAt: String(this.values[7]),
        updatedAt: String(this.values[8]),
      });

      return {
        success: true,
      };
    }

    if (this.query.includes("update") && this.query.includes("headers_json")) {
      const id = String(this.values[7]);
      const index = this.database.webhookEndpoints.findIndex(
        (endpoint) => endpoint.id === id,
      );

      if (index >= 0) {
        this.database.webhookEndpoints[index] = {
          ...this.database.webhookEndpoints[index],
          merchantId:
            this.values[0] === null || this.values[0] === undefined
              ? undefined
              : String(this.values[0]),
          url: String(this.values[1]),
          headers:
            this.values[2] === null || this.values[2] === undefined
              ? undefined
              : JSON.parse(String(this.values[2])),
          eventTypes:
            this.values[3] === null || this.values[3] === undefined
              ? undefined
              : JSON.parse(String(this.values[3])),
          signingSecret:
            this.values[4] === null || this.values[4] === undefined
              ? undefined
              : String(this.values[4]),
          enabled: this.values[5] === 1,
          updatedAt: String(this.values[6]),
        };
      }

      return {
        success: true,
      };
    }

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
