# Contributing

`zkpay` is early and product-contract-first. Keep changes small, typed, and
covered by focused tests.

## Local Checks

```bash
npm install
npm run check
npm run docs:build
```

## Engineering Rules

- Product primitives belong in `packages/core`.
- Developer convenience belongs in `packages/sdk`.
- HTTP behavior belongs in `packages/api`.
- CLI behavior belongs in `packages/cli`.
- Checkout UI should consume the SDK rather than redefining intent or receipt
  shapes.
- New payment fields should be documented in `docs/v0.1.md` before they are
  exposed through SDK or API surfaces.

## GitHub Pages

Docs source lives in Markdown files under `docs/`. `npm run docs:build`
generates the Pages-ready HTML files, and `.github/workflows/pages.yml`
publishes `docs/` to GitHub Pages.
