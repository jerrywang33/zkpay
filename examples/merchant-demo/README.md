# Merchant Demo

This example shows the intended v0.2 integration loop:

```txt
create payment -> send payer to hosted checkout -> receive Sui digest -> verify /payments/verify/sui -> fulfill
```

Run from the repository root:

```bash
node examples/merchant-demo/index.ts
```

Use a real deployed receipt package when one is available:

```bash
ZKPAY_BINDING_PACKAGE_ID=0x... npm run example:merchant
```

Expected output includes:

```txt
Send payer to: https://zkpay.sh/pay/zkp_demo123?intent=...&network=testnet&coinType=...&decimals=6&bindingPackageId=0xabc
Route: sponsored programmable-checkout-requires-sponsor
Backend verifies Sui settlement with: {
  "txDigest": "H2jbnwW7j5T9s2YRJrZupaymentdigest",
  "binding": {
    "packageId": "0xabc"
  }
}
Fulfill order: ord_123
```

The demo still uses a local receipt object for the final fulfillment assertion,
because it does not submit a real Sui transaction. A real merchant backend
should send the printed Sui verification payload to `/payments/verify/sui` and
fulfill only after that route returns `ok: true`.
