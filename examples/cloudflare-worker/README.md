# zkpay Cloudflare Worker

Minimal Worker API boundary using `zkpay-sh/api` and Cloudflare D1 for durable
Sui replay protection plus optional webhook delivery logs.

```ts
import {
  createD1SuiReplayStore,
  createD1WebhookDeliveryStore,
  createHttpWebhookDispatcher,
  createZkpayApi,
} from "zkpay-sh/api";

const webhookDispatcher = env.ZKPAY_WEBHOOK_URL
  ? createHttpWebhookDispatcher({
      targets: [{ url: env.ZKPAY_WEBHOOK_URL }],
    })
  : undefined;

const app = createZkpayApi({
  replayStore: createD1SuiReplayStore(env.ZKPAY_REPLAY),
  webhookSecret: env.ZKPAY_WEBHOOK_SECRET,
  webhookDispatcher,
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

The Worker stays non-custodial. Merchant fulfillment should happen after the
backend receives a successful verification response.
