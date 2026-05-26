# @zkpay/core

Core payment primitives for zkpay.

```bash
npm install zkpay-sh@next
```

```ts
import {
  buildHostedCheckoutUrl,
  createPaymentIntent,
  resolveGasRoute,
  verifyPaymentReceipt,
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
