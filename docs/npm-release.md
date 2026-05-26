# npm Release

zkpay publishes a single public alpha package first.

## Target Package

```txt
zkpay-sh
```

The package bundles the workspace core, SDK, and CLI outputs so developers can
install one package while the `@zkpay` npm scope is reserved.

```txt
zkpay-sh       main SDK export
zkpay-sh/core  core payment model and verification primitives
zkpay-sh/sdk   SDK export
zkpay          CLI binary
zkpay-sh       CLI binary alias
```

`@zkpay/api` is built with the workspace but is not part of the public alpha
publish target.

## Versioning

The first alpha version is:

```txt
0.1.0-alpha.0
```

It is published under the `next` dist-tag. Because `zkpay-sh` starts with only
one public version, npm may also point `latest` at the same alpha until a stable
release exists. Developer docs should still use `zkpay-sh@next`.

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
