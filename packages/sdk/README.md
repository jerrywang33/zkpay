# @zkpay/sdk

Developer SDK for zkpay.

```bash
npm install zkpay-sh@next
```

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
});

console.log(payment.checkoutUrl);
```

Sui testnet settlement verification is also available:

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
  coinType: "0x...::usdc::USDC",
  binding: {
    packageId: "0x...",
  },
});
```

The optional `binding` package should expose `receipt::bind`, which emits a
`PaymentBound` event containing payer, receiver, amount, coin type, payment id,
and nonce.

`@zkpay/sdk` remains the workspace package boundary. Public installs use
`zkpay-sh` until `@zkpay` npm scope access is available.
