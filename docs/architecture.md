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
before fulfillment.

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

## Current Scope

v0.2 connects hosted checkout, the SDK, and the API to a Sui testnet settlement
loop. zkLogin proving, webhook delivery, digest replay storage, and onchain
payment-id binding remain the next integration layers.
