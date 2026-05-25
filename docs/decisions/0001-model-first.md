# 0001: Model First

Date: 2026-05-25

## Decision

Build zkpay from the payment contract outward:

```txt
PaymentIntent -> GasRouteDecision -> PaymentReceipt -> Verification
```

## Rationale

The product value is not a page or wallet button. It is a stable contract that
apps can integrate without rebuilding checkout, gas policy, and receipt
verification themselves.

Starting with the model lets SDK, CLI, API, hosted checkout, and docs share the
same source of truth.

## Consequences

- UI work should consume `@zkpay/sdk`.
- API work should wrap SDK behavior instead of duplicating core logic.
- zkLogin and Sui RPC integration should attach to existing intent and receipt
  contracts.
