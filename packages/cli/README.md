# @zkpay/cli

Command line tools for zkpay payment links.

```bash
npm install -g zkpay-sh@next
```

```bash
zkpay link create \
  --amount 20 \
  --coin USDC \
  --receiver 0x84f \
  --label "API credits" \
  --json
```

Verify a Sui testnet receipt:

```bash
zkpay receipt verify-sui \
  --intent '<json-or-checkout-url>' \
  --tx-digest H2j... \
  --coin-type 0x...::usdc::USDC \
  --decimals 6 \
  --binding-package-id 0x... \
  --network testnet \
  --json
```

`@zkpay/cli` remains the workspace package boundary. Public installs use
`zkpay-sh` until `@zkpay` npm scope access is available.
