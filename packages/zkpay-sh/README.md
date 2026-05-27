# zkpay-sh

Sui stablecoin checkout SDK and CLI for zkpay.sh.

```bash
npm install zkpay-sh@next
```

Node 22 or newer is recommended because this package includes the Sui
TypeScript SDK.

```ts
import { ZkpayClient } from "zkpay-sh";

const zkpay = new ZkpayClient({
  baseUrl: "https://zkpay.sh",
});

const payment = zkpay.createPayment({
  amount: "20",
  coin: "USDC",
  receiver: "0x84f",
  label: "API credits",
  metadata: {
    orderId: "ord_123",
  },
}, {
  checkout: {
    network: "testnet",
    coinType: "0x...::usdc::USDC",
    decimals: 6,
    bindingPackageId: "0x...",
  },
});

console.log(payment.checkoutUrl);
```

Create signed webhook events for merchant fulfillment:

```ts
const event = zkpay.createWebhookEvent({
  type: "payment.succeeded",
  paymentId: payment.intent.id,
  intent: payment.intent,
  receipt,
});

const signatureHeader = zkpay.signWebhookEvent(
  event,
  process.env.ZKPAY_WEBHOOK_SECRET,
);
```

Build and verify a Sui testnet settlement:

```ts
const built = zkpay.buildSuiPaymentTransaction({
  intent: payment.intent,
  payer: "0x...",
  coinType: "0x...::usdc::USDC",
  decimals: 6,
  binding: {
    packageId: "0x...",
  },
});

const result = await zkpay.verifySuiPayment({
  intent: payment.intent,
  txDigest: "H2j...",
  coinType: built.coinType,
  binding: {
    packageId: "0x...",
  },
});
```

Subpath exports are available for lower-level imports:

```ts
import { createPaymentIntent } from "zkpay-sh/core";
import { ZkpayClient } from "zkpay-sh/sdk";
import {
  createD1WebhookDeliveryStore,
  createHttpWebhookDispatcher,
  createZkpayApi,
} from "zkpay-sh/api";
```

`createHttpWebhookDispatcher` can be attached to the API for opt-in webhook
delivery after successful verification. `createD1WebhookDeliveryStore` records
delivery attempts for reconciliation and operations.

The package also exposes the CLI:

```bash
npm install -g zkpay-sh@next
zkpay link create --amount 20 --coin USDC --receiver 0x84f --json
ZKPAY_SIGNING_SECRET=merchant_secret zkpay link create --amount 20 --coin USDC --receiver 0x84f --json
ZKPAY_SIGNING_SECRET=merchant_secret zkpay intent verify-signature --intent 'https://zkpay.sh/pay/zkp_...?intent=...&signature=...' --json
ZKPAY_WEBHOOK_SECRET=webhook_secret zkpay webhook sign --intent '<json-or-checkout-url>' --receipt '<json>' --json
ZKPAY_WEBHOOK_SECRET=webhook_secret zkpay webhook verify --event '<webhook-sign-json-output>' --json
zkpay receipt verify-sui --intent '<json-or-checkout-url>' --tx-digest H2j... --coin-type 0x...::usdc::USDC --decimals 6 --binding-package-id 0x... --json
```
