# Webhooks

zkpay webhook signing is a merchant-side primitive. It defines the event shape
and HMAC signature boundary for fulfillment automation. The API can attach a
signed webhook event to successful verification responses when `webhookSecret`
is configured, and it can optionally dispatch those events to static targets or
a webhook endpoint registry.

## Event Shape

```json
{
  "id": "zkw_...",
  "type": "payment.succeeded",
  "paymentId": "zkp_...",
  "createdAt": "2026-05-25T01:01:00.000Z",
  "intent": {},
  "receipt": {},
  "data": {}
}
```

Supported event types:

```txt
payment.succeeded
payment.failed
payment.updated
```

## Sign

```ts
import { createWebhookEvent, signWebhookEvent } from "zkpay-sh/core";

const event = createWebhookEvent({
  type: "payment.succeeded",
  paymentId: intent.id,
  intent,
  receipt,
});

const signatureHeader = signWebhookEvent(
  event,
  process.env.ZKPAY_WEBHOOK_SECRET,
);
```

The signature header format is:

```txt
t=<unix_timestamp>,v1=<base64url_hmac_sha256>
```

The signed payload is:

```txt
<timestamp>.<canonical_webhook_event_json>
```

## Verify

```ts
import { verifyWebhookSignature } from "zkpay-sh/core";

const ok = verifyWebhookSignature(
  event,
  signatureHeader,
  process.env.ZKPAY_WEBHOOK_SECRET,
);
```

The default timestamp tolerance is 300 seconds. Pass
`{ toleranceSeconds: -1 }` to disable timestamp checks in tests.

## SDK

```ts
import { ZkpayClient } from "zkpay-sh";

const zkpay = new ZkpayClient({
  webhookSecret: process.env.ZKPAY_WEBHOOK_SECRET,
});

const event = zkpay.createWebhookEvent({
  type: "payment.succeeded",
  paymentId: intent.id,
  intent,
  receipt,
});

const signatureHeader = zkpay.signWebhookEvent(event);
```

Merchant backends should verify webhook signatures before updating fulfillment,
ledger, or reconciliation state.

## API Verification Responses

```ts
import { createZkpayApi } from "zkpay-sh/api";

const app = createZkpayApi({
  webhookSecret: process.env.ZKPAY_WEBHOOK_SECRET,
});
```

Successful `/payments/verify` and `/payments/verify/sui` responses include:

```json
{
  "ok": true,
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

Without a dispatcher, the API returns the signed event so merchant systems can
forward, store, or verify it inside their own fulfillment pipeline.

To enable opt-in delivery from the API, attach a dispatcher:

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
  }),
  webhookDeliveryStore: createD1WebhookDeliveryStore(env.DB),
});
```

The dispatcher posts the canonical event JSON and sets
`zkpay-signature: t=...,v1=...`. Static targets use the API-level
`webhookSecret`; managed endpoints can carry an endpoint-specific signing
secret so each merchant destination can rotate independently. Verification
responses include `webhookDelivery` results so merchant systems can observe
whether delivery was accepted. With a delivery store, each result is recorded by
event id, payment id, target URL, status, attempt count, error, and completion
time.

Endpoint registries are useful once a merchant can manage webhook endpoints
from a dashboard. The built-in D1 registry reads `zkpay_webhook_endpoints`,
selects enabled global endpoints plus endpoints whose `merchant_id` matches
`intent.metadata.merchantId`, then filters by `event_types_json` when present.
When `webhookEndpointStore` is configured, the API also exposes
`POST /webhooks/endpoints`, `GET /webhooks/endpoints`, and
`PATCH /webhooks/endpoints/:id` for merchant endpoint management. Management
responses redact sensitive headers and only expose `hasSigningSecret`.
`POST /webhooks/endpoints/:id/test` sends one signed `payment.updated` test
event to the stored endpoint URL. These routes are alpha primitives and should
sit behind merchant authentication in production.

Delivery logs can be queried from the same API when the configured store
supports listing:

```bash
curl "https://api.example.com/webhooks/deliveries?paymentId=zkp_...&limit=20"
curl "https://api.example.com/webhooks/deliveries?eventId=evt_..."
```

The built-in memory store and D1 store both support this route.

## CLI

```bash
ZKPAY_WEBHOOK_SECRET=webhook_secret zkpay webhook sign \
  --intent '<json-or-checkout-url>' \
  --receipt '<json>' \
  --source payments.verify.sui \
  --json
```

The command returns:

```json
{
  "event": {},
  "signatureHeader": "t=...,v1=..."
}
```

Verify an event locally:

```bash
ZKPAY_WEBHOOK_SECRET=webhook_secret zkpay webhook verify \
  --event '<webhook-sign-json-output>' \
  --json
```

If the event JSON does not include `signatureHeader`, pass
`--signature-header 't=...,v1=...'` explicitly.
