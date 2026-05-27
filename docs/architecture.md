# zkpay Architecture

`zkpay` is organized around one product invariant:

```txt
PaymentIntent -> Authorization -> GasRouteDecision -> PaymentReceipt -> Verification
```

## Packages

| Package | Responsibility |
| --- | --- |
| `@zkpay/core` | Schemas, payment URI, gas routing, receipt verification. |
| `@zkpay/sdk` | Developer-facing client around core primitives and Sui testnet settlement verification. |
| `@zkpay/api` | Hono HTTP boundary for payment creation, local verification, and Sui receipt verification. |
| `@zkpay/cli` | Payment link and Sui receipt verification command surface. |
| `zkpay-sh` | Public npm package bundling the core, SDK, and CLI outputs. |

Public consumers should install `zkpay-sh@next`. The scoped packages remain
workspace boundaries until `@zkpay` npm scope access is available.

## Surfaces

### Merchant backend

Creates payment intents, stores order metadata, receives receipts, and verifies
before fulfillment. In v0.2 the Hono boundary includes a pluggable replay store
so a merchant backend can reject reused Sui transaction digests before marking
an order paid.

### Hosted checkout

Presents amount, coin, receiver, and authorization route. In v0.2 it also loads
a browser Wallet Standard handoff that can connect a Sui wallet, submit a
stablecoin transfer, capture the transaction digest, and render the backend
verification payload. It should not custody funds or decide fulfillment.

### Sui network

Settles stablecoin transfers and provides transaction data for verification.

The v0.2 verifier uses Sui RPC transaction effects and balance changes to check
the digest, receiver, coin type, and atomic amount before a merchant fulfills
the order.

When a receipt binding package is configured, the payment transaction also calls
`receipt::bind` and emits `PaymentBound`. The verifier then checks that the
event binds the payer, receiver, amount, coin type, payment id, and nonce to the
same transaction digest.

### Move receipt package

`move/zkpay_receipt` is the current alpha Move package for onchain binding. It
is intentionally small: it only emits the payment binding event and does not
custody funds or mutate merchant state. A canonical deployed package is still a
hardening item.

## Current Scope

v0.2 connects hosted checkout, the SDK, and the API to a Sui testnet settlement
loop. The default replay store is in-process memory for demos; durable replay
storage, webhook endpoint registries, endpoint management routes, webhook
delivery storage, endpoint-specific webhook signing secrets, manual test
delivery, optional management API key guards, and a queryable delivery log API
are available as alpha primitives. zkLogin proving, merchant endpoint management
UI, and a canonical deployed receipt package remain the next integration layers.

As of May 27, 2026, this is the alpha MVP checkpoint. The repository is in a
stable pause state for demos and developer review: website, docs, CI, npm alpha
package, hosted checkout, Sui digest verification, webhook signing, endpoint
management, and delivery logs are aligned. The architecture should stay narrow
until the next phase deliberately chooses zkLogin checkout, merchant operations,
or production gas routing as the main hardening line.
