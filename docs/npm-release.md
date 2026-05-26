# npm Release

zkpay publishes developer packages as alpha builds first.

## Target Packages

```txt
@zkpay/core
@zkpay/sdk
@zkpay/cli
```

`@zkpay/api` is built with the workspace but is not part of the first alpha
publish target.

## Versioning

The first alpha version is:

```txt
0.1.0-alpha.0
```

It should be published under the `next` dist-tag, not `latest`.

## Local Release Flow

```bash
npm install
npm run check
npm run pack:check
NPM_TOKEN=... npm run publish:alpha
```

The publish script writes a temporary npm config under `.npm-cache/`, publishes
in dependency order, then removes the temporary config.

## Scope Note

The `@zkpay/core` and `@zkpay/sdk` package names already exist on npm. Publishing
requires access to the `@zkpay` npm scope. If the token does not belong to a
maintainer of that scope, npm will return a permission error.
