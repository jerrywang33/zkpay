# zkpay API

The first API package is intentionally thin. It wraps the workspace SDK with
Hono and keeps the product boundary explicit. For public installs, use
`zkpay-sh/api`.

```ts
import { createZkpayApi } from "zkpay-sh/api";
```

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
    "requiresProgrammableTransaction": false,
    "checkout": {
      "network": "testnet",
      "coinType": "0x...::usdc::USDC",
      "decimals": 6,
      "bindingPackageId": "0x..."
    }
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
  "checkoutUrl": "https://zkpay.sh/pay/zkp_...?intent=...&network=testnet&coinType=0x...::usdc::USDC&decimals=6&bindingPackageId=0x...",
  "paymentUri": "zkpay://payment/zkp_...?...",
  "gasRoute": {
    "kind": "sponsored",
    "payerGas": "sponsored",
    "reason": "programmable-checkout-requires-sponsor"
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

Hosted checkout can produce the Sui verification payload after the payer submits
a wallet transaction. Merchant systems should send that payload to the Sui route
below from their backend, not trust the browser result alone.

## Verify Sui Settlement

```txt
POST /payments/verify/sui
```

Request:

```json
{
  "intent": {},
  "txDigest": "H2j...",
  "coinType": "0x...::usdc::USDC",
  "decimals": 6,
  "expectedSender": "0x...",
  "amountPolicy": "exact",
  "binding": {
    "packageId": "0x...",
    "eventType": "0x...::receipt::PaymentBound"
  },
  "options": {
    "enforceExpiration": true
  }
}
```

Response:

```json
{
  "ok": true,
  "errors": [],
  "receipt": {
    "paymentId": "zkp_...",
    "status": "succeeded",
    "txDigest": "H2j...",
    "amount": "20",
    "coin": "USDC",
    "receiver": "0x...",
    "nonce": "...",
    "settledAt": "2026-05-25T01:00:00.000Z"
  }
}
```

The Sui route verifies transaction effects and balance changes through RPC. It
can also require a `PaymentBound` event when `binding.packageId` is supplied.
Without binding, merchant systems must treat the zkpay nonce as offchain state,
store transaction digests, and reject reuse.

## Replay Guard

`createZkpayApi()` enables an in-process Sui replay store by default. After a
successful `/payments/verify/sui` response, the store records the payment id and
transaction digest. A repeated digest or a second digest for the same payment id
returns `409`.

Replay response shape:

```json
{
  "ok": false,
  "errors": ["digest_already_used"],
  "replay": {
    "ok": false,
    "reason": "digest_already_used",
    "existing": {},
    "attempted": {}
  }
}
```

The default store only protects a single running API process. Production
merchant backends should pass a durable `replayStore` implementation backed by
their own database or cache.
