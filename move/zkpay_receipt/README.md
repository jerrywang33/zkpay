# zkpay_receipt

Alpha Sui Move package for binding a zkpay payment intent to the settlement
transaction.

The package exposes one entry function:

```txt
receipt::bind(receiver, amount_atomic, coin_type, payment_id, nonce)
```

It emits `PaymentBound` with:

- `payer`
- `receiver`
- `amount_atomic`
- `coin_type`
- `payment_id`
- `nonce`

The package does not custody funds and does not mark orders paid. It only gives
the SDK and merchant verifier an onchain event to require before fulfillment.

Build and publish with the Sui CLI from this directory:

```bash
sui move build
sui client publish --gas-budget 100000000
```

From the repository root, use:

```bash
npm run move:build
npm run move:publish:testnet
```

`npm run move:publish:testnet` uses the active Sui CLI account and defaults to a
`100000000` MIST gas budget. Override the gas budget if needed:

```bash
ZKPAY_RECEIPT_GAS_BUDGET=200000000 npm run move:publish:testnet
```

Check the publish path without spending gas:

```bash
ZKPAY_RECEIPT_DRY_RUN=true npm run move:publish:testnet
```

Dry runs print `ZKPAY_DRY_RUN_BINDING_PACKAGE_ID=...`; real publishes print
`ZKPAY_BINDING_PACKAGE_ID=...`.

This is not yet a canonical zkpay mainnet package. Production users should
audit and deploy their own package until a canonical package is published.
