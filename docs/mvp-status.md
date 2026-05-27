# Alpha MVP Status

As of May 27, 2026, zkpay is an alpha MVP. The first developer-facing checkout
loop is complete enough to pause, demo, document, and let early builders inspect
the integration model.

## What Is Complete

- Public website, docs, GitHub repository, CI, and npm alpha package.
- `zkpay-sh@next` public package with core, SDK, API, CLI, and hosted checkout
  runtime exports.
- Payment intent creation through SDK, API, and CLI.
- Hosted checkout link payloads and wallet handoff for Sui testnet settlement.
- Sui digest verification against receiver, coin type, amount, sender, replay
  guard, and optional receipt binding event.
- Signed payment intents for hosted checkout URL integrity.
- Signed webhook events for merchant fulfillment boundaries.
- HTTP webhook dispatcher, endpoint registries, endpoint management routes,
  endpoint-specific signing secrets, manual test delivery, delivery stores, and
  delivery-log queries.
- Optional management API key guard for webhook endpoint management and delivery
  logs.

## What It Is Good For

- Product demos.
- Developer review.
- Merchant backend prototypes.
- Sui testnet checkout experiments.
- Documentation, positioning, and package surface validation.

## What It Is Not Yet

- A production custody or payment operations product.
- A complete zkLogin checkout implementation.
- A live mainnet gasless stablecoin routing engine.
- A merchant dashboard.
- A full authentication, rate limit, audit, alerting, and reconciliation system.
- A replacement for merchant-side fulfillment, accounting, or compliance logic.

## Next Restart Point

The next phase should pick one main line instead of adding broad surface area:

- zkLogin checkout: OAuth entry, zkLogin address derivation, proof handling,
  transaction authorization, and wallet fallback.
- Merchant operations: dashboard, API keys, endpoint management UI, delivery
  logs, replay store administration, and reconciliation exports.
- Production gas routing: live Sui stablecoin eligibility, gasless route
  detection, sponsor fallback policy, and mainnet receipt package hardening.

Until one of those tracks is chosen, the current alpha should stay stable and
documented rather than keep accumulating unrelated features.
