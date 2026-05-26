# @zkpay/sdk

Developer SDK for zkpay.

```bash
npm install @zkpay/sdk@next
```

```ts
import { ZkpayClient } from "@zkpay/sdk";

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

This alpha package wraps `@zkpay/core` with the primary developer-facing client.
