# zkLogin Integration Notes

zkLogin is the intended payer onboarding path for zkpay, but it should enter
after the payment contract is stable.

## Role in Checkout

zkLogin should handle account entry and transaction authorization:

```txt
OAuth identity -> zkLogin address -> authorize Sui transaction -> settle payment
```

It should not change the merchant-facing contract. A merchant still creates a
`PaymentIntent` and verifies a `PaymentReceipt`.

## v0.1 Boundary

v0.1 can validate the loop with wallet authorization first:

```txt
PaymentIntent -> wallet authorization -> settlement digest -> receipt verification
```

Once that loop is reliable, zkLogin can replace or augment the authorization
step without changing gas route policy or receipt verification.

## Open Questions

- Which OAuth providers should be supported first?
- Should checkout show both zkLogin and wallet options by default?
- How should merchants communicate payer identity without storing unnecessary
  personal data?
- Which zkLogin proof flow belongs in hosted checkout versus merchant-hosted
  checkout?
