# @zkpay/core

Core payment primitives for zkpay.

```bash
npm install zkpay-sh@next
```

```ts
import {
  createPaymentIntent,
  resolveGasRoute,
  verifyPaymentReceipt,
} from "zkpay-sh/core";
```

This alpha package defines the model layer: `PaymentIntent`, hosted checkout
payloads, gas route decisions, and deterministic receipt verification.
