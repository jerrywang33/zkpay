# @zkpay/api

Hono API boundary for zkpay payment creation, local receipt verification, and
Sui settlement verification.

```txt
GET  /health
POST /payments
POST /payments/verify
POST /payments/verify/sui
```

`/payments/verify/sui` uses a pluggable replay store. The default store is
in-process memory and rejects a repeated transaction digest or a second digest
for an already settled payment id. Production apps should inject a durable store
before fulfillment logic depends on it.

The same route can require an onchain zkpay receipt event by passing
`binding.packageId`. When present, verification fails unless `PaymentBound`
matches the payer, receiver, amount, coin type, payment id, and nonce.

When `createZkpayApi({ signingSecret, requireIntentSignature: true })` is used,
`/payments/verify` and `/payments/verify/sui` reject missing or invalid hosted
checkout signatures before receipt verification runs.

When `createZkpayApi({ webhookSecret })` is used, successful verification
responses include a signed `payment.succeeded` webhook event and signature
header. Merchant systems can verify that event before fulfillment or ledger
updates.

Webhook delivery is opt-in through a dispatcher:

```ts
import {
  createD1WebhookDeliveryStore,
  createHttpWebhookDispatcher,
  createZkpayApi,
} from "zkpay-sh/api";

const app = createZkpayApi({
  webhookSecret: process.env.ZKPAY_WEBHOOK_SECRET,
  webhookDispatcher: createHttpWebhookDispatcher({
    targets: [
      {
        url: "https://merchant.example/webhooks/zkpay",
      },
    ],
  }),
  webhookDeliveryStore: createD1WebhookDeliveryStore(env.DB),
});
```

Delivery logs are best-effort. If the log store fails, payment verification and
webhook response generation still complete.

Configured delivery stores can be queried through
`GET /webhooks/deliveries?paymentId=zkp_...` or
`GET /webhooks/deliveries?eventId=evt_...` for reconciliation and operations
views.

`POST /payments` also accepts `options.checkout` so merchant backends can
generate hosted checkout URLs with `network`, `coinType`, `decimals`, and
`bindingPackageId` already attached.

Cloudflare D1 replay and webhook delivery storage are available without another
dependency:

```ts
import {
  createD1SuiReplayStore,
  createD1WebhookDeliveryStore,
  createZkpayApi,
} from "zkpay-sh/api";

const app = createZkpayApi({
  replayStore: createD1SuiReplayStore(env.DB),
  webhookDeliveryStore: createD1WebhookDeliveryStore(env.DB),
});
```

This package is part of the workspace build. Public installs currently use the
bundled `zkpay-sh` package until `@zkpay` npm scope access is available.
