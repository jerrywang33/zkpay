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
- Signed payment intents and signed webhook event primitives.
- Signed webhook events on successful API verification responses.
- Local webhook signing and verification through the CLI.
- Opt-in HTTP webhook dispatcher with retry policy.
- In-memory and D1 webhook endpoint registries.
- Webhook endpoint management API.
- Endpoint-specific webhook signing secrets and redacted management responses.
- Manual webhook endpoint test delivery API.
- Optional management API key guard for endpoint and delivery-log routes.
- In-memory and D1 webhook delivery log stores.
- Delivery log query API by payment id or event id.

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
- Delivery log viewer and alerting.

## v1.0: Merchant Operations

- Dashboard.
- API keys.
- Webhook delivery logs.
- Reconciliation export.
