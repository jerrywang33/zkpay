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
});

console.log(payment.checkoutUrl);
```

Build and verify a Sui testnet settlement:

```ts
const built = zkpay.buildSuiPaymentTransaction({
  intent: payment.intent,
  payer: "0x...",
  coinType: "0x...::usdc::USDC",
  decimals: 6,
});

const result = await zkpay.verifySuiPayment({
  intent: payment.intent,
  txDigest: "H2j...",
  coinType: built.coinType,
});
```

Subpath exports are available for lower-level imports:

```ts
import { createPaymentIntent } from "zkpay-sh/core";
import { ZkpayClient } from "zkpay-sh/sdk";
```

The package also exposes the CLI:

```bash
npm install -g zkpay-sh@next
zkpay link create --amount 20 --coin USDC --receiver 0x84f --json
zkpay receipt verify-sui --intent '<json-or-checkout-url>' --tx-digest H2j... --coin-type 0x...::usdc::USDC --decimals 6 --json
```
