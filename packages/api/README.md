# @zkpay/api

Hono API boundary for zkpay payment creation, local receipt verification, and
Sui settlement verification.

```txt
GET  /health
POST /payments
POST /payments/verify
POST /payments/verify/sui
```

`/payments/verify/sui` uses a pluggable replay store. The default store is
in-process memory and rejects a repeated transaction digest or a second digest
for an already settled payment id. Production apps should inject a durable store
before fulfillment logic depends on it.

This package is part of the workspace build. Public installs currently use the
bundled `zkpay-sh` package until `@zkpay` npm scope access is available.
