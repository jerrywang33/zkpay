# Webhooks

zkpay webhook signing is a merchant-side primitive. It does not deliver
webhooks by itself yet; it defines the event shape and HMAC signature boundary
that merchant systems can use once fulfillment automation is attached.

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
