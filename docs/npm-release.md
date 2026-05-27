# npm Release

zkpay publishes a single public alpha package first.

## Target Package

```txt
zkpay-sh
```

The package bundles the workspace core, SDK, API, and CLI outputs so developers
can install one package while the `@zkpay` npm scope is reserved.

Install it with:

```bash
npm install zkpay-sh@next
npm install -g zkpay-sh@next
```

Node 22 or newer is recommended because `zkpay-sh` now includes the Sui
TypeScript SDK for transaction building and receipt verification.

```txt
zkpay-sh       main SDK export
zkpay-sh/core  core payment model and verification primitives
zkpay-sh/sdk   SDK export
zkpay-sh/api   Hono API boundary
zkpay          CLI binary
zkpay-sh       CLI binary alias
```

`@zkpay/api` remains an internal workspace package until `@zkpay` scope access is
available. Public installs should use `zkpay-sh/api`.

## Versioning

The current alpha version is:

```txt
0.2.0-alpha.16
```

It is published under the `next` dist-tag. Developer docs should use
`zkpay-sh@next`; `latest` is not the integration target while the package is in
alpha.

`0.2.0-alpha.16` adds in-memory and D1 webhook delivery log stores plus a
Cloudflare Worker example schema update. `0.2.0-alpha.15` added an opt-in HTTP
webhook dispatcher with retry policy for successful API verification responses.
`0.2.0-alpha.14` lets
`zkpay webhook verify` consume the JSON output from `zkpay webhook sign --json`
directly and adds CLI regression coverage. `0.2.0-alpha.13` added
`zkpay webhook sign` and `zkpay webhook verify` for local webhook testing from
scripts. `0.2.0-alpha.12` added signed webhook events to
successful API verification responses when `webhookSecret` is configured.
`0.2.0-alpha.11` added webhook event creation plus HMAC signing and verification
helpers across core and the SDK. `0.2.0-alpha.10` added
`zkpay intent verify-signature` so CLI users can verify a signed hosted checkout
URL from scripts. `0.2.0-alpha.9` lets the CLI create signed hosted checkout
links through `ZKPAY_SIGNING_SECRET` or `--signing-secret`. These build on the
D1 replay store, checkout runtime options, signed payment intents, and optional
Sui receipt binding work from earlier alpha releases.

## Local Release Flow

```bash
npm install
npm run check
npm run pack:check
NPM_TOKEN=... npm run publish:alpha
```

The publish script writes a temporary npm config under `.npm-cache/`, publishes
in dependency order, then removes the temporary config.

## Scope Plan

The `@zkpay/core` and `@zkpay/sdk` package names already exist on npm. Publishing
under the `@zkpay` scope requires maintainer access to that npm scope. Until that
access is available, `zkpay-sh` is the public install path and the scoped
packages remain internal workspace boundaries.

## Published Verification

After publishing, verify both the SDK and CLI from the registry package:

```bash
npm view zkpay-sh@next version
npm install zkpay-sh@next
npx zkpay link create --amount 20 --coin USDC --receiver 0x84f --label "API credits" --json
ZKPAY_SIGNING_SECRET=merchant_secret npx zkpay link create --amount 20 --coin USDC --receiver 0x84f --json
ZKPAY_SIGNING_SECRET=merchant_secret npx zkpay intent verify-signature --intent 'https://zkpay.sh/pay/zkp_...?intent=...&signature=...' --json
ZKPAY_WEBHOOK_SECRET=webhook_secret npx zkpay webhook sign --intent '<json-or-checkout-url>' --receipt '<json>' --json
ZKPAY_WEBHOOK_SECRET=webhook_secret npx zkpay webhook verify --event '<webhook-sign-json-output>' --json
```
