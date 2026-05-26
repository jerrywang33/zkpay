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
packages/api    Hono API boundary for create/verify routes
packages/cli    early zkpay command surface
examples/       merchant integration examples
docs/           product and integration docs
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
```

Custody, fulfillment, and merchant business logic stay in the merchant app;
zkpay defines the payment object, route decision, and receipt verification
result.

## npm Alpha Packages

The first npm alpha release targets the developer-facing packages:

```bash
npm install @zkpay/sdk@next
npm install -g @zkpay/cli@next
```

Published package targets:

```txt
@zkpay/core  Payment model, URI payload, gas routing, receipt verification
@zkpay/sdk   Developer client around core primitives
@zkpay/cli   Payment link command surface
```

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
