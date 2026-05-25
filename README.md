# zkpay

Sui-native stablecoin checkout infrastructure.

```txt
Payment Links -> zkLogin Checkout -> Gas Routing -> Receipt Verification.
```

The public website lives at `https://zkpay.sh`. Product docs are intended to
live at `https://jerrywang33.github.io/zkpay/`.

## v0.1 Focus

The first useful version should close one narrow payment loop:

```txt
merchant creates PaymentIntent
-> payer opens checkout
-> payer authorizes stablecoin payment
-> zkpay resolves gas route
-> merchant verifies receipt
-> order becomes paid
```

zkLogin is part of the intended checkout path, but the first code milestone
starts with the product contract: intent, route policy, and receipt verification.

## Workspace

```txt
packages/core   PaymentIntent, GasRoutePolicy, ReceiptVerification
packages/sdk    developer-facing client wrapper
packages/cli    early zkpay command surface
docs/           product and integration docs
```

## Local

```bash
npm install
npm run check
npm run dev
```

## Deploy

```bash
npm run deploy
```
