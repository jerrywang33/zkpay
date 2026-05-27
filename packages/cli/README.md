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
  --network testnet \
  --coin-type 0x...::usdc::USDC \
  --decimals 6 \
  --binding-package-id 0x... \
  --json
```

Signed hosted checkout links:

```bash
ZKPAY_SIGNING_SECRET=merchant_secret zkpay link create \
  --amount 20 \
  --coin USDC \
  --receiver 0x84f \
  --network testnet \
  --json
```

Verify a hosted checkout signature:

```bash
ZKPAY_SIGNING_SECRET=merchant_secret zkpay intent verify-signature \
  --intent 'https://zkpay.sh/pay/zkp_...?intent=...&signature=...' \
  --json
```

Sign and verify webhook events:

```bash
ZKPAY_WEBHOOK_SECRET=webhook_secret zkpay webhook sign \
  --intent '<json-or-checkout-url>' \
  --receipt '<json>' \
  --source payments.verify.sui \
  --json

ZKPAY_WEBHOOK_SECRET=webhook_secret zkpay webhook verify \
  --event '<json>' \
  --signature-header 't=...,v1=...' \
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
