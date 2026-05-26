# Sui Gas Routing

zkpay treats gasless payment as a route decision.

## Route Order

```txt
1. Eligible gasless stablecoin transfer
2. Sponsored transaction fallback
3. Payer-paid fallback
```

## Supported Gasless Stablecoin Registry

The default registry tracks the stablecoin symbols announced for Sui gasless
stablecoin transfers:

```txt
USDsui, SuiUSDe, AUSD, FDUSD, USDB, USDC, USDY
```

This list is product policy, not hard protocol truth. Apps can pass a stricter
registry with `network`, `coinType`, and `decimals` when they want route
decisions to reflect a known allowlist:

```ts
resolveGasRoute({
  intent,
  network: "testnet",
  coinType: "0x...::usdc::USDC",
  decimals: 6,
  gaslessStablecoins: [
    {
      symbol: "USDC",
      network: "testnet",
      coinType: "0x...::usdc::USDC",
      decimals: 6,
    },
  ],
});
```

Runtime eligibility should eventually be checked against Sui network
capabilities, Address Balances support, and coin type allowlists.

## Product Rule

Do not call every path gasless.

If checkout requires programmable transaction logic, receipt creation, onchain
`PaymentBound` binding, swap, deposit, or another extra operation, zkpay should
either sponsor gas or explain why payer-paid fallback is required.
