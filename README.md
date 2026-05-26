# zkpay

Sui-native stablecoin checkout infrastructure.

```txt
Payment Links -> zkLogin Checkout -> Gas Routing -> Receipt Verification.
```

The public website lives at `https://zkpay.sh`. Product docs are published at
`https://zkpay.sh/docs/`, with GitHub Pages workflow support for the repo docs.

## v0.1 Focus

The first useful version should close one narrow payment loop:

```txt
merchant creates PaymentIntent
-> payer opens checkout
-> payer authorizes stablecoin payment
-> hosted checkout returns Sui transaction digest
-> zkpay resolves gas route
-> merchant verifies receipt
-> order becomes paid
```

zkLogin is part of the intended checkout path, but the first code milestone
starts with the product contract: intent, route policy, and receipt verification.

## Workspace

```txt
packages/core   PaymentIntent, GasRoutePolicy, ReceiptVerification
packages/sdk    developer-facing client wrapper and Sui settlement verifier
packages/api    Hono API boundary for create/verify/Sui receipt routes
packages/cli    payment link and Sui receipt command surface
packages/zkpay-sh public npm package bundling core, sdk, and cli
examples/       merchant integration examples
docs/           product and integration docs
site/           browser checkout runtime source
```

## Local

```bash
npm install
npm run build
npm run check
npm run example:merchant
npm run dev
```

`npm run dev` serves the landing page and hosted checkout routes with SPA
fallback, so generated URLs like `/pay/zkp_...?intent=...` work locally.

## Docs

```bash
npm run docs:build
```

Markdown files under `docs/` are the source of truth. The generated HTML files
are committed so GitHub Pages can publish the docs directly.

## First API Boundary

`@zkpay/api` exposes a thin Hono app around the SDK:

```txt
GET  /health
POST /payments
POST /payments/verify
POST /payments/verify/sui
```

Custody, fulfillment, and merchant business logic stay in the merchant app;
zkpay defines the payment object, route decision, and receipt verification
result.

## npm Alpha Package

The first npm alpha release uses one public package while the `@zkpay` npm scope
is reserved:

```bash
npm install zkpay-sh@next
npm install -g zkpay-sh@next
```

Node 22 or newer is recommended because the package includes the Sui TypeScript
SDK.

Package surface:

```txt
zkpay-sh       Developer client around core primitives
zkpay-sh/core  Payment model, URI payload, gas routing, receipt verification
zkpay-sh/sdk   Developer client export
zkpay          Payment link command surface
zkpay-sh       CLI alias
```

Sui testnet settlement:

```ts
import { ZkpayClient } from "zkpay-sh";

const zkpay = new ZkpayClient();
const result = await zkpay.verifySuiPayment({
  intent,
  txDigest,
  coinType: "0x...::usdc::USDC",
});
```

Hosted checkout links under `/pay/:id` now load a browser wallet handoff. The
page connects a Wallet Standard Sui wallet, submits the stablecoin transfer,
captures the transaction digest, and emits the JSON payload a merchant backend
can send to `/payments/verify/sui`.

Release command:

```bash
npm run publish:alpha
```

## Deploy

```bash
npm run deploy
```

Cloudflare Pages deploys the public site and `/docs/`. GitHub Pages can also
publish the same `docs/` directory from the repository workflow.
