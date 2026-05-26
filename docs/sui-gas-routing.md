# Sui Gas Routing

zkpay treats gasless payment as a route decision.

## Route Order

```txt
1. Eligible gasless stablecoin transfer
2. Sponsored transaction fallback
3. Payer-paid fallback
```

## Supported Gasless Stablecoin Symbols

The v0.1 model tracks the stablecoin set announced for Sui gasless stablecoin
transfers:

```txt
USDsui, SuiUSDe, AUSD, FDUSD, USDB, USDC, USDY
```

This list should be treated as product policy, not hard protocol truth. Runtime
eligibility should eventually be checked against Sui network capabilities and
coin type allowlists.

## Product Rule

Do not call every path gasless.

If checkout requires programmable transaction logic, receipt creation, onchain
`PaymentBound` binding, swap, deposit, or another extra operation, zkpay should
either sponsor gas or explain why payer-paid fallback is required.
