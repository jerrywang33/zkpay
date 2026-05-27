# zkpay API

The first API package is intentionally thin. It wraps the workspace SDK with
Hono and keeps the product boundary explicit. For public installs, use
`zkpay-sh/api`.

```ts
import { createZkpayApi } from "zkpay-sh/api";
```

## Health

```txt
GET /health
```

Response:

```json
{
  "ok": true,
  "service": "zkpay-api"
}
```

## Create Payment

```txt
POST /payments
```

Request:

```json
{
  "payment": {
    "amount": "20",
    "coin": "USDC",
    "receiver": "0x84f",
    "label": "API credits",
    "metadata": {
      "orderId": "ord_123"
    }
  },
  "options": {
    "requiresProgrammableTransaction": false,
    "checkout": {
      "network": "testnet",
      "coinType": "0x...::usdc::USDC",
      "decimals": 6,
      "bindingPackageId": "0x..."
    }
  }
}
```

Response:

```json
{
  "intent": {
    "id": "zkp_...",
    "amount": "20",
    "coin": "USDC",
    "receiver": "0x84f",
    "label": "API credits",
    "metadata": {
      "orderId": "ord_123"
    },
    "nonce": "...",
    "createdAt": "2026-05-25T00:00:00.000Z"
  },
  "checkoutUrl": "https://zkpay.sh/pay/zkp_...?intent=...&network=testnet&coinType=0x...::usdc::USDC&decimals=6&bindingPackageId=0x...",
  "paymentUri": "zkpay://payment/zkp_...?...",
  "gasRoute": {
    "kind": "sponsored",
    "payerGas": "sponsored",
    "reason": "programmable-checkout-requires-sponsor"
  }
}
```

## Verify Payment

```txt
POST /payments/verify
```

Request:

```json
{
  "intent": {},
  "signature": "hmac...",
  "receipt": {},
  "options": {
    "enforceExpiration": true
  }
}
```

Response:

```json
{
  "ok": true,
  "errors": [],
  "webhook": {
    "event": {
      "id": "zkw_...",
      "type": "payment.succeeded",
      "paymentId": "zkp_...",
      "createdAt": "2026-05-25T01:01:00.000Z",
      "intent": {},
      "receipt": {},
      "data": {
        "source": "payments.verify"
      }
    },
    "signatureHeader": "t=...,v1=..."
  }
}
```

The API does not custody funds and does not mark merchant orders paid by itself.
Merchant systems should call verification before fulfillment.

Hosted checkout can produce the Sui verification payload after the payer submits
a wallet transaction. Merchant systems should send that payload to the Sui route
below from their backend, not trust the browser result alone.

## Verify Sui Settlement

```txt
POST /payments/verify/sui
```

Request:

```json
{
  "intent": {},
  "signature": "hmac...",
  "txDigest": "H2j...",
  "coinType": "0x...::usdc::USDC",
  "decimals": 6,
  "expectedSender": "0x...",
  "amountPolicy": "exact",
  "binding": {
    "packageId": "0x...",
    "eventType": "0x...::receipt::PaymentBound"
  },
  "options": {
    "enforceExpiration": true
  }
}
```

Response:

```json
{
  "ok": true,
  "errors": [],
  "receipt": {
    "paymentId": "zkp_...",
    "status": "succeeded",
    "txDigest": "H2j...",
    "amount": "20",
    "coin": "USDC",
    "receiver": "0x...",
    "nonce": "...",
    "settledAt": "2026-05-25T01:00:00.000Z"
  },
  "webhook": {
    "event": {
      "type": "payment.succeeded",
      "paymentId": "zkp_...",
      "data": {
        "source": "payments.verify.sui"
      }
    },
    "signatureHeader": "t=...,v1=..."
  }
}
```

The Sui route verifies transaction effects and balance changes through RPC. It
can also require a `PaymentBound` event when `binding.packageId` is supplied.
Without binding, merchant systems must treat the zkpay nonce as offchain state,
store transaction digests, and reject reuse.

If `createZkpayApi({ signingSecret, requireIntentSignature: true })` is used,
both verification routes reject missing or invalid signatures with `401`.

If `createZkpayApi({ webhookSecret })` is used, successful verification
responses include a signed webhook event. Merchant backends can forward the
event internally or store it for reconciliation, then verify the
`signatureHeader` with the same secret before fulfillment.

Webhook delivery is opt-in through `webhookDispatcher`. The helper below posts
the signed event body with a `zkpay-signature` header and records delivery
results in the verification response:

```ts
import {
  createD1WebhookEndpointRegistry,
  createD1WebhookDeliveryStore,
  createHttpWebhookDispatcher,
  createZkpayApi,
} from "zkpay-sh/api";

const webhookEndpointStore = createD1WebhookEndpointRegistry(env.DB);

const app = createZkpayApi({
  webhookSecret: process.env.ZKPAY_WEBHOOK_SECRET,
  webhookEndpointStore,
  webhookDispatcher: createHttpWebhookDispatcher({
    targets: [
      {
        url: "https://merchant.example/webhooks/zkpay",
      },
    ],
    endpointRegistry: webhookEndpointStore,
    retry: {
      attempts: 3,
      delayMs: 250,
    },
  }),
  webhookDeliveryStore: createD1WebhookDeliveryStore(env.DB),
});
```

Delivery result:

```json
{
  "webhookDelivery": [
    {
      "ok": true,
      "url": "https://merchant.example/webhooks/zkpay",
      "status": 202,
      "attemptCount": 1,
      "completedAt": "2026-05-25T01:02:00.000Z"
    }
  ],
  "webhookDeliveryLog": {
    "ok": true,
    "recordCount": 1,
    "completedAt": "2026-05-25T01:02:00.000Z"
  }
}
```

The delivery log store is best-effort. If it fails, verification responses still
return the signed webhook event and delivery results with `webhookDeliveryLog`
set to a failed log status.

`endpointRegistry` lets the dispatcher resolve targets per webhook event instead
of hardcoding every URL in process config. The built-in memory registry and D1
registry support optional `merchantId` and `eventTypes` filters. For D1, store
the merchant id in `PaymentIntent.metadata.merchantId`; global endpoints use a
null `merchant_id` and receive matching events for every merchant.

### `POST /webhooks/endpoints`

When `webhookEndpointStore` is configured, merchant systems can create managed
webhook endpoints:

```bash
curl -X POST "https://api.example.com/webhooks/endpoints" \
  -H "content-type: application/json" \
  -d '{
    "id": "endpoint_acme_primary",
    "merchantId": "merchant_acme",
    "url": "https://merchant.example/webhooks/zkpay",
    "eventTypes": ["payment.succeeded"],
    "signingSecret": "whsec_merchant_endpoint_secret",
    "enabled": true
  }'
```

Response:

```json
{
  "endpoint": {
    "id": "endpoint_acme_primary",
    "merchantId": "merchant_acme",
    "url": "https://merchant.example/webhooks/zkpay",
    "eventTypes": ["payment.succeeded"],
    "enabled": true,
    "hasSigningSecret": true,
    "createdAt": "2026-05-27T05:30:00.000Z",
    "updatedAt": "2026-05-27T05:30:00.000Z"
  }
}
```

`signingSecret` is stored for delivery signing and is never returned. Management
responses include `hasSigningSecret` and redact sensitive headers such as
`authorization`, `token`, `secret`, and `x-api-key`.

### `GET /webhooks/endpoints`

```bash
curl "https://api.example.com/webhooks/endpoints?merchantId=merchant_acme&enabled=true"
```

Returns `{ "endpoints": [...] }`. `merchantId`, `enabled`, and `limit` are
optional. `limit` defaults to `50` and is capped at `100`.

### `PATCH /webhooks/endpoints/:id`

```bash
curl -X PATCH "https://api.example.com/webhooks/endpoints/endpoint_acme_primary" \
  -H "content-type: application/json" \
  -d '{ "enabled": false }'
```

Returns the updated endpoint, or `404` with `webhook_endpoint_not_found`.
Production deployments should protect these management routes with merchant
authentication before exposing them outside a trusted backend boundary.

### `POST /webhooks/endpoints/:id/test`

```bash
curl -X POST "https://api.example.com/webhooks/endpoints/endpoint_acme_primary/test" \
  -H "content-type: application/json" \
  -d '{
    "paymentId": "zkp_webhook_test",
    "eventType": "payment.updated",
    "data": { "reason": "manual-test" }
  }'
```

The API sends one signed test event to the endpoint URL and returns
`{ "endpoint": ..., "delivery": ... }`. The endpoint's own `signingSecret` is
used when present; otherwise `webhookSecret` is used as a fallback.

### `GET /webhooks/deliveries`

When the API is configured with a delivery store that supports listing, webhook
attempts can be queried for reconciliation or operations screens:

```bash
curl "https://api.example.com/webhooks/deliveries?paymentId=zkp_...&limit=20"
curl "https://api.example.com/webhooks/deliveries?eventId=evt_..."
```

Response:

```json
{
  "deliveries": [
    {
      "eventId": "evt_...",
      "paymentId": "zkp_...",
      "eventType": "payment.succeeded",
      "targetUrl": "https://merchant.example/webhooks/zkpay",
      "ok": true,
      "status": 202,
      "attemptCount": 1,
      "completedAt": "2026-05-25T01:02:00.000Z"
    }
  ]
}
```

`paymentId`, `eventId`, and `limit` are optional. `limit` defaults to `50` and
is capped at `100`. If no list-capable delivery store is configured, the route
returns `501` with `webhook_delivery_store_unavailable`.

## Replay Guard

`createZkpayApi()` enables an in-process Sui replay store by default. After a
successful `/payments/verify/sui` response, the store records the payment id and
transaction digest. A repeated digest or a second digest for the same payment id
returns `409`.

Replay response shape:

```json
{
  "ok": false,
  "errors": ["digest_already_used"],
  "replay": {
    "ok": false,
    "reason": "digest_already_used",
    "existing": {},
    "attempted": {}
  }
}
```

The default store only protects a single running API process. Production
merchant backends should pass a durable `replayStore` implementation backed by
their own database or cache.

Cloudflare D1 is supported through the public API subpath for both replay
protection, webhook endpoint registry, and webhook delivery logs:

```ts
import {
  createD1SuiReplayStore,
  createD1WebhookEndpointRegistry,
  createD1WebhookEndpointRegistrySchema,
  createD1WebhookDeliveryStore,
  createD1WebhookDeliveryStoreSchema,
  createD1SuiReplayStoreSchema,
  createHttpWebhookDispatcher,
  createZkpayApi,
} from "zkpay-sh/api";

console.log(createD1SuiReplayStoreSchema());
console.log(createD1WebhookEndpointRegistrySchema());
console.log(createD1WebhookDeliveryStoreSchema());

const webhookEndpointStore = createD1WebhookEndpointRegistry(env.DB);

const app = createZkpayApi({
  replayStore: createD1SuiReplayStore(env.DB),
  webhookEndpointStore,
  webhookDispatcher: createHttpWebhookDispatcher({
    endpointRegistry: webhookEndpointStore,
  }),
  webhookDeliveryStore: createD1WebhookDeliveryStore(env.DB),
});
```

See `examples/cloudflare-worker/` for a minimal Worker entrypoint and D1 schema.
