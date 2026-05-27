# zkpay Cloudflare Worker

Minimal Worker API boundary using `zkpay-sh/api` and Cloudflare D1 for durable
Sui replay protection plus optional webhook delivery logs.

```ts
import {
  createD1SuiReplayStore,
  createD1WebhookEndpointRegistry,
  createD1WebhookDeliveryStore,
  createHttpWebhookDispatcher,
  createZkpayApi,
} from "zkpay-sh/api";

const webhookEndpointStore = createD1WebhookEndpointRegistry(env.ZKPAY_REPLAY);

const webhookDispatcher = env.ZKPAY_WEBHOOK_SECRET
  ? createHttpWebhookDispatcher({
      targets: env.ZKPAY_WEBHOOK_URL
        ? [{ url: env.ZKPAY_WEBHOOK_URL }]
        : [],
      endpointRegistry: webhookEndpointStore,
    })
  : undefined;

const app = createZkpayApi({
  replayStore: createD1SuiReplayStore(env.ZKPAY_REPLAY),
  webhookSecret: env.ZKPAY_WEBHOOK_SECRET,
  webhookDispatcher,
  webhookEndpointStore,
  webhookDeliveryStore: webhookDispatcher
    ? createD1WebhookDeliveryStore(env.ZKPAY_REPLAY)
    : undefined,
});
```

Create a D1 database and apply `schema.sql` before using
`/payments/verify/sui` in production. The table uses `payment_id` as the primary
key and `tx_digest` as a unique column, so the API can reject both repeated
digests and a second digest for an already-settled payment.

When `ZKPAY_WEBHOOK_URL` and `ZKPAY_WEBHOOK_SECRET` are configured, successful
verification responses can post signed `payment.succeeded` events and record
delivery attempts in `zkpay_webhook_delivery`.
Those attempts are queryable through `GET /webhooks/deliveries?paymentId=...`
or `GET /webhooks/deliveries?eventId=...`.
Additional endpoints can be stored in `zkpay_webhook_endpoints`; rows with a
null `merchant_id` are global, and merchant-scoped rows match
`PaymentIntent.metadata.merchantId`. Set `signing_secret` when a merchant
endpoint should use its own webhook verification secret instead of the global
Worker secret.
The same D1 table powers `POST /webhooks/endpoints`,
`GET /webhooks/endpoints`, `PATCH /webhooks/endpoints/:id`, and
`POST /webhooks/endpoints/:id/test` for trusted merchant backend or dashboard
use.

The Worker stays non-custodial. Merchant fulfillment should happen after the
backend receives a successful verification response.
