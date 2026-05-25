# Merchant Demo

This example shows the intended v0.1 integration loop:

```txt
create payment -> send payer to checkout -> receive receipt -> verify -> fulfill
```

Run from the repository root:

```bash
node examples/merchant-demo/index.ts
```

Expected output includes:

```txt
Send payer to: https://zkpay.sh/pay/zkp_demo123?intent=...
Route: gasless-stablecoin eligible-stablecoin-transfer
Fulfill order: ord_123
```
