# zkpay-sh

Sui stablecoin checkout SDK and CLI for zkpay.sh.

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

Subpath exports are available for lower-level imports:

```ts
import { createPaymentIntent } from "zkpay-sh/core";
import { ZkpayClient } from "zkpay-sh/sdk";
```

The package also exposes the CLI:

```bash
npm install -g zkpay-sh@next
zkpay link create --amount 20 --coin USDC --receiver 0x84f --json
```
