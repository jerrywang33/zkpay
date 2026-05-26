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
0.2.0-alpha.7
```

It is published under the `next` dist-tag. Developer docs should use
`zkpay-sh@next`; `latest` is not the integration target while the package is in
alpha.

`0.2.0-alpha.7` lets SDK clients fill hosted checkout `coinType` and `decimals`
from `gaslessStablecoins` when payment creation only passes `network`.
`0.2.0-alpha.6` added structured gasless stablecoin registry inputs for
`network`, `coinType`, and `decimals`. `0.2.0-alpha.5` added a Cloudflare D1
replay store adapter for the public `zkpay-sh/api` subpath. These build on the
checkout URL runtime options added in `0.2.0-alpha.3` and the optional Sui
receipt binding support from `0.2.0-alpha.2`.

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
```
