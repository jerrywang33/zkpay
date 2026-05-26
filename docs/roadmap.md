# zkpay Roadmap

## v0.1: Product Contract

- PaymentIntent schema.
- Hosted checkout URL payload.
- Hosted checkout shell that renders signed intent payloads.
- Payment URI format.
- Gas route decision model.
- Receipt verification model.
- SDK, CLI, and Hono API skeleton.

## v0.2: Sui Settlement Prototype

- Wallet-submittable Sui transaction builder.
- Hosted checkout wallet handoff.
- Transaction digest capture from wallet execution.
- Receipt verification against Sui RPC balance changes.
- In-process digest replay guard for `/payments/verify/sui`.
- `/payments/verify/sui` backend route.
- CLI receipt verification for demos and scripts.
- Optional onchain payment binding through `receipt::bind` and `PaymentBound`.

## v0.2 Next Hardening

- Durable merchant replay store adapters.
- Publish and audit a canonical zkpay receipt package on Sui testnet/mainnet.
- Gasless stablecoin eligibility checks from live network data.

## v0.3: zkLogin Path

- OAuth sign-in.
- zkLogin address derivation and transaction authorization.
- Wallet fallback.

## v0.4: Sui Payment Kit Alignment

- Payment Kit-compatible receipt fields.
- Duplicate payment prevention.
- Merchant webhook signing.

## v1.0: Merchant Operations

- Dashboard.
- API keys.
- Webhook delivery logs.
- Reconciliation export.
