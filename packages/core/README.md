# @zkpay/core

Core payment primitives for zkpay.

```bash
npm install zkpay-sh@next
```

```ts
import {
  buildHostedCheckoutUrl,
  createPaymentIntent,
  createWebhookEvent,
  resolveGasRoute,
  signPaymentIntent,
  signWebhookEvent,
  verifyPaymentIntentSignature,
  verifyPaymentReceipt,
  verifyWebhookSignature,
} from "zkpay-sh/core";
```

This alpha package defines the model layer: `PaymentIntent`, hosted checkout
payloads, gas route decisions, and deterministic receipt verification.

`buildHostedCheckoutUrl` also accepts Sui checkout runtime parameters:

```ts
buildHostedCheckoutUrl("https://zkpay.sh", intent, {
  network: "testnet",
  coinType: "0x...::usdc::USDC",
  decimals: 6,
  bindingPackageId: "0x...",
});
```

Payment intents can be signed before they are placed in hosted checkout URLs:

```ts
const signature = signPaymentIntent(intent, process.env.ZKPAY_SIGNING_SECRET);

verifyPaymentIntentSignature(intent, signature, process.env.ZKPAY_SIGNING_SECRET);
```

Webhook events can use the same HMAC boundary:

```ts
const event = createWebhookEvent({
  type: "payment.succeeded",
  paymentId: intent.id,
  intent,
  receipt,
});
const header = signWebhookEvent(event, process.env.ZKPAY_WEBHOOK_SECRET);

verifyWebhookSignature(event, header, process.env.ZKPAY_WEBHOOK_SECRET);
```

Gas routing can use a strict stablecoin registry:

```ts
resolveGasRoute({
  intent,
  network: "testnet",
  coinType: "0x...::usdc::USDC",
  decimals: 6,
  gaslessStablecoins: [
    {
      symbol: "USDC",
      network: "testnet",
      coinType: "0x...::usdc::USDC",
      decimals: 6,
    },
  ],
});
```
