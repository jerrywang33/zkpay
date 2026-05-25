# zkpay Architecture

`zkpay` is organized around one product invariant:

```txt
PaymentIntent -> Authorization -> GasRouteDecision -> PaymentReceipt -> Verification
```

## Packages

| Package | Responsibility |
| --- | --- |
| `@zkpay/core` | Schemas, payment URI, gas routing, receipt verification. |
| `@zkpay/sdk` | Developer-facing client around core primitives. |
| `@zkpay/api` | Hono HTTP boundary for payment creation and verification. |
| `@zkpay/cli` | Early command surface for payment links and scripts. |

## Surfaces

### Merchant backend

Creates payment intents, stores order metadata, receives receipts, and verifies
before fulfillment.

### Hosted checkout

Presents amount, coin, receiver, and authorization route. It should not custody
funds.

### Sui network

Settles stablecoin transfers and provides transaction data for verification.

## Current Scope

v0.1 is model-first. It does not yet connect to Sui RPC, zkLogin proving, or
Payment Kit receipt events. Those integrations should attach to the existing
intent and receipt contracts rather than redefine them.
