# zkpay API

The first API package is intentionally thin. It wraps `@zkpay/sdk` with Hono and
keeps the product boundary explicit.

## Health

```txt
GET /health
```

Response:

```json
{
  "ok": true,
  "service": "zkpay-api"
}
```

## Create Payment

```txt
POST /payments
```

Request:

```json
{
  "payment": {
    "amount": "20",
    "coin": "USDC",
    "receiver": "0x84f",
    "label": "API credits",
    "metadata": {
      "orderId": "ord_123"
    }
  },
  "options": {
    "requiresProgrammableTransaction": false
  }
}
```

Response:

```json
{
  "intent": {
    "id": "zkp_...",
    "amount": "20",
    "coin": "USDC",
    "receiver": "0x84f",
    "label": "API credits",
    "metadata": {
      "orderId": "ord_123"
    },
    "nonce": "...",
    "createdAt": "2026-05-25T00:00:00.000Z"
  },
  "checkoutUrl": "https://zkpay.sh/pay/zkp_...?intent=...",
  "paymentUri": "zkpay://payment/zkp_...?...",
  "gasRoute": {
    "kind": "gasless-stablecoin",
    "payerGas": "zero",
    "reason": "eligible-stablecoin-transfer"
  }
}
```

## Verify Payment

```txt
POST /payments/verify
```

Request:

```json
{
  "intent": {},
  "receipt": {},
  "options": {
    "enforceExpiration": true
  }
}
```

Response:

```json
{
  "ok": true,
  "errors": []
}
```

The API does not custody funds and does not mark merchant orders paid by itself.
Merchant systems should call verification before fulfillment.
