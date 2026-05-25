# Security

`zkpay` is not production payment infrastructure yet.

Do not use the current code to custody funds or automatically fulfill merchant
orders without an independent verification layer.

## Current Security Boundary

The v0.1 verifier checks local receipt fields against a `PaymentIntent`.
Production verification still needs:

- Sui RPC transaction lookup;
- sender and receiver validation against transaction effects;
- stablecoin object or balance movement validation;
- duplicate receipt prevention;
- webhook signing;
- merchant API authentication.

## Secrets

Never commit local tokens. The repository ignores `.env*`.
