# zkpay Cloudflare Worker

Minimal Worker API boundary using `zkpay-sh/api` and Cloudflare D1 for durable
Sui replay protection.

```ts
import { createD1SuiReplayStore, createZkpayApi } from "zkpay-sh/api";

const app = createZkpayApi({
  replayStore: createD1SuiReplayStore(env.ZKPAY_REPLAY),
});
```

Create a D1 database and apply `schema.sql` before using
`/payments/verify/sui` in production. The table uses `payment_id` as the primary
key and `tx_digest` as a unique column, so the API can reject both repeated
digests and a second digest for an already-settled payment.

The Worker stays non-custodial. Merchant fulfillment should happen after the
backend receives a successful verification response.
