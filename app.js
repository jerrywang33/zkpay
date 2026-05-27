const app = document.querySelector("#app");

const proofPoints = [
  {
    label: "For payers",
    title: "Pay with a familiar login",
    body: "Use zkLogin or a wallet path to authorize a Sui stablecoin payment without turning checkout into wallet education.",
  },
  {
    label: "For apps",
    title: "No SUI balance dead end",
    body: "Route eligible stablecoin transfers through Sui gasless rails and fall back to sponsored gas when the flow needs more logic.",
  },
  {
    label: "For merchants",
    title: "Verify every paid order",
    body: "Return receipt data that a backend can check against amount, coin, receiver, transaction digest, and optional binding event.",
  },
];

const flowSteps = [
  ["Create", "Your app creates a payment intent with amount, coin, receiver, and order metadata."],
  ["Open", "The payer lands on a hosted checkout page or an embedded checkout component."],
  ["Authorize", "zkLogin or wallet signing approves the exact Sui transaction that will settle the order."],
  ["Route", "zkpay chooses gasless stablecoin transfer, sponsor-paid fallback, or payer-paid fallback."],
  ["Verify", "Your backend marks the order paid only after receipt verification succeeds."],
];

const capabilities = [
  {
    title: "Payment Links",
    body: "Create a stablecoin payment URL for invoices, credits, memberships, game items, and agent workflows.",
    meta: "Intent API / CLI / SDK",
  },
  {
    title: "zkLogin Checkout",
    body: "Let users enter checkout with an OAuth account, then authorize payment on Sui without managing a seed phrase first.",
    meta: "Hosted page / embedded flow",
  },
  {
    title: "Gas Routing",
    body: "Use Sui gasless stablecoin transfers when supported, then apply clear sponsor or payer fallback policy.",
    meta: "Eligibility / reason codes",
  },
  {
    title: "Receipt Verification",
    body: "Give merchants a deterministic way to verify settlement and optional onchain binding before fulfillment.",
    meta: "Digest / nonce / event / webhook",
  },
  {
    title: "Managed Webhooks",
    body: "Register merchant endpoints, sign deliveries per destination, redact secrets, and test delivery before orders depend on it.",
    meta: "Endpoint API / D1 / test events",
  },
];

const useCases = [
  ["AI agents", "High-frequency stablecoin payments with predictable settlement records."],
  ["Sui games", "Let players buy assets or credits without forcing SUI top-ups."],
  ["Developer tools", "Sell API credits and subscriptions with payment links and webhooks."],
  ["Consumer apps", "Keep onboarding close to a normal checkout, not a crypto tutorial."],
];

const routePolicy = [
  ["Eligible stablecoin transfer", "$0 gas for payer", "Use Sui gasless stablecoin transfer path."],
  ["Checkout with receipt logic", "Sponsor gas", "Merchant or app pays for the extra transaction logic."],
  ["Unsupported coin or route", "Fallback clearly", "Show the route and cost instead of pretending it is gasless."],
];

const supportedGaslessStablecoins = new Set([
  "USDsui",
  "SuiUSDe",
  "AUSD",
  "FDUSD",
  "USDB",
  "USDC",
  "USDY",
]);

function renderHeader() {
  return `
    <header class="topbar">
      <a class="brand" href="/" aria-label="zkpay home">
        <span class="brand-mark" aria-hidden="true">💧</span>
        <span>zkpay</span>
      </a>
      <nav class="nav" aria-label="Primary navigation">
        <a class="nav-docs" href="/docs/">Docs</a>
        <a class="nav-icon nav-github" href="https://github.com/jerrywang33/zkpay" target="_blank" rel="noreferrer" aria-label="GitHub">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.11.8-.25.8-.56v-2.14c-3.25.71-3.94-1.38-3.94-1.38-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.18.08 1.8 1.21 1.8 1.21 1.04 1.79 2.73 1.27 3.4.97.1-.76.41-1.27.74-1.56-2.6-.3-5.33-1.3-5.33-5.76 0-1.27.45-2.31 1.2-3.13-.12-.3-.52-1.5.12-3.08 0 0 .98-.31 3.18 1.2a10.9 10.9 0 0 1 5.78 0c2.2-1.51 3.17-1.2 3.17-1.2.64 1.58.24 2.78.12 3.08.75.82 1.2 1.86 1.2 3.13 0 4.48-2.74 5.46-5.35 5.75.42.36.8 1.08.8 2.18v3.23c0 .31.21.68.81.56A11.5 11.5 0 0 0 12 .7Z" />
          </svg>
        </a>
        <a class="nav-icon nav-x" href="https://x.com/jerrydev90" target="_blank" rel="noreferrer" aria-label="Built by Jerry on X">
          <span aria-hidden="true">𝕏</span>
        </a>
      </nav>
    </header>
  `;
}

function renderProofPoints() {
  return proofPoints
    .map(
      (item) => `
        <article class="proof-card">
          <span>${item.label}</span>
          <h3>${item.title}</h3>
          <p>${item.body}</p>
        </article>
      `,
    )
    .join("");
}

function renderFlowSteps() {
  return flowSteps
    .map(
      ([label, body], index) => `
        <li>
          <span>${String(index + 1).padStart(2, "0")}</span>
          <strong>${label}</strong>
          <p>${body}</p>
        </li>
      `,
    )
    .join("");
}

function renderCapabilities() {
  return capabilities
    .map(
      (item) => `
        <article class="capability-card">
          <h3>${item.title}</h3>
          <p>${item.body}</p>
          <span>${item.meta}</span>
        </article>
      `,
    )
    .join("");
}

function renderUseCases() {
  return useCases
    .map(
      ([title, body]) => `
        <article>
          <h3>${title}</h3>
          <p>${body}</p>
        </article>
      `,
    )
    .join("");
}

function renderRoutePolicy() {
  return routePolicy
    .map(
      ([route, payer, note]) => `
        <div class="policy-row">
          <strong>${route}</strong>
          <span>${payer}</span>
          <p>${note}</p>
        </div>
      `,
    )
    .join("");
}

function render() {
  app.innerHTML = `
    <div class="site-shell">
      ${renderHeader()}

      <main>
        <section class="hero" id="product">
          <div class="hero-copy">
            <p class="eyebrow">Sui stablecoin checkout infrastructure</p>
            <h1>Stablecoin payments for Sui apps, without gas friction.</h1>
            <p class="lede">
              zkpay helps Sui apps create payment links and hosted checkout
              flows powered by zkLogin, gasless stablecoin transfers,
              sponsored gas fallback, and verifiable receipts.
            </p>
            <div class="hero-actions">
              <a class="primary-action" href="#developers">Install alpha</a>
              <a class="secondary-action" href="/docs/">Read docs</a>
            </div>
            <button class="install-command" type="button" data-copy="npm install zkpay-sh@next">
              <span>npm install</span>
              <code>npm install zkpay-sh@next</code>
            </button>
            <div class="release-note">
              <span>0.2.0-alpha.21</span>
              <span>Management routes can now require Bearer or x-zkpay-api-key auth for safer dashboard and Worker deployments.</span>
            </div>
          </div>

          <aside class="checkout-preview" aria-label="zkpay checkout preview">
            <div class="preview-head">
              <span>zkpay checkout</span>
              <strong>20 USDC</strong>
            </div>
            <div class="merchant-line">
              <span>Receiver</span>
              <strong>0x84f...91a</strong>
            </div>
            <ol class="preview-steps">
              <li>
                <span></span>
                <p>Sign in with zkLogin or wallet</p>
              </li>
              <li>
                <span></span>
                <p>Route through gasless stablecoin transfer</p>
              </li>
              <li>
                <span></span>
                <p>Return a verifiable receipt</p>
              </li>
            </ol>
            <div class="receipt-strip">
              <span>status</span>
              <strong>verified</strong>
            </div>
          </aside>
        </section>

        <section class="proof-section">
          <div class="section-kicker">What zkpay removes</div>
          <div class="proof-grid">
            ${renderProofPoints()}
          </div>
        </section>

        <section class="split-section">
          <div class="section-copy">
            <p class="eyebrow">Why Sui</p>
            <h2>Sui now has the primitives for a checkout product, not just a transfer.</h2>
          </div>
          <div class="primitive-list">
            <div>
              <strong>zkLogin</strong>
              <p>Web2-style account entry that can still authorize Sui transactions.</p>
            </div>
            <div>
              <strong>Gasless stablecoin transfers</strong>
              <p>Eligible stablecoin transfers can avoid requiring a separate SUI balance.</p>
            </div>
            <div>
              <strong>Sponsored transactions</strong>
              <p>Apps can pay gas when checkout includes receipt or programmable logic.</p>
            </div>
            <div>
              <strong>Onchain verification</strong>
              <p>Receipts can be checked by merchant systems before order fulfillment.</p>
            </div>
          </div>
        </section>

        <section class="flow-section" id="flow">
          <div class="section-copy centered">
            <p class="eyebrow">Product flow</p>
            <h2>One checkout path from payment intent to verified settlement.</h2>
            <p>
              zkpay wraps the parts that every app would otherwise rebuild:
              intent creation, payer authorization, gas route policy,
              settlement, and receipt verification.
            </p>
          </div>
          <ol class="flow-list">
            ${renderFlowSteps()}
          </ol>
        </section>

        <section class="capabilities-section">
          <div class="section-copy">
            <p class="eyebrow">Core capabilities</p>
            <h2>The product surface is small on purpose.</h2>
            <p>
              The first useful version should make one thing reliable: accept a
              Sui stablecoin payment and prove to the merchant that it settled.
            </p>
          </div>
          <div class="capability-grid">
            ${renderCapabilities()}
          </div>
        </section>

        <section class="developer-section" id="developers">
          <div class="developer-copy">
            <p class="eyebrow">Developer surface</p>
            <h2>Create the intent. Open checkout. Verify the returned Sui digest.</h2>
            <p>
              The public alpha is live as <strong>zkpay-sh@next</strong>. It bundles the
              SDK, core primitives, CLI, Sui transaction builder, hosted wallet
              handoff, RPC receipt verifier, and managed webhook APIs while the
              merchant keeps custody and fulfillment logic. Management routes
              can be protected with an opt-in API key guard.
            </p>
          </div>
          <div class="code-stack">
            <article class="code-panel">
              <div class="code-head">
                <span>Install</span>
                <button type="button" data-copy="npm install zkpay-sh@next">Copy</button>
              </div>
              <pre><code>npm install zkpay-sh@next
npm install -g zkpay-sh@next</code></pre>
            </article>
            <article class="code-panel">
              <div class="code-head">
                <span>Build transaction</span>
                <button type="button" data-copy="const built = zkpay.buildSuiPaymentTransaction({ intent: payment.intent, payer: '0x...', coinType: '0x...::usdc::USDC', decimals: 6, binding: { packageId: '0x...' } });">Copy</button>
              </div>
              <pre><code>const zkpay = new ZkpayClient();
const payment = zkpay.createPayment({
  amount: "20",
  coin: "USDC",
  receiver: "0x84f",
  label: "API credits"
}, {
  checkout: {
    network: "testnet",
    coinType: "0x...::usdc::USDC",
    decimals: 6,
    bindingPackageId: "0x..."
  }
});

const built = zkpay.buildSuiPaymentTransaction({
  intent: payment.intent,
  payer: "0x...",
  coinType: "0x...::usdc::USDC",
  decimals: 6,
  binding: {
    packageId: "0x..."
  }
});</code></pre>
            </article>
            <article class="code-panel">
              <div class="code-head">
                <span>Verify digest</span>
                <button type="button" data-copy="await zkpay.verifySuiPayment({ intent: payment.intent, txDigest, coinType: '0x...::usdc::USDC', binding: { packageId: '0x...' } });">Copy</button>
              </div>
              <pre><code>const result = await zkpay.verifySuiPayment({
  intent: payment.intent,
  txDigest,
  coinType: "0x...::usdc::USDC",
  expectedSender: "0x...",
  binding: {
    packageId: "0x..."
  }
});

if (!result.ok) throw new Error(result.errors.join(", "));</code></pre>
            </article>
            <article class="code-panel">
              <div class="code-head">
                <span>Hosted checkout</span>
                <button type="button" data-copy="https://zkpay.sh/pay/zkp_...?intent=...&network=testnet&coinType=0x...::usdc::USDC&decimals=6&bindingPackageId=0x...">Copy</button>
              </div>
              <pre><code>https://zkpay.sh/pay/zkp_...?intent=...&amp;network=testnet&amp;coinType=0x...::usdc::USDC&amp;decimals=6&amp;bindingPackageId=0x...

// checkout connects a Sui wallet, submits payment,
// returns txDigest, then builds /payments/verify/sui payload</code></pre>
            </article>
            <article class="code-panel">
              <div class="code-head">
                <span>Webhook endpoint</span>
                <button type="button" data-copy="curl -X POST https://api.example.com/webhooks/endpoints/endpoint_acme/test -H 'authorization: Bearer zkpay_mgmt_...' -H 'content-type: application/json' -d '{&quot;paymentId&quot;:&quot;zkp_webhook_test&quot;,&quot;data&quot;:{&quot;reason&quot;:&quot;manual-test&quot;}}'">Copy</button>
              </div>
              <pre><code>await api.request("/webhooks/endpoints", {
  method: "POST",
  body: JSON.stringify({
    id: "endpoint_acme",
    merchantId: "merchant_acme",
    url: "https://merchant.example/webhooks/zkpay",
    signingSecret: "whsec_..."
  })
});

await api.request("/webhooks/endpoints/endpoint_acme/test", {
  method: "POST",
  headers: {
    authorization: "Bearer zkpay_mgmt_..."
  }
});</code></pre>
            </article>
            <article class="code-panel">
              <div class="code-head">
                <span>CLI</span>
                <button type="button" data-copy="zkpay receipt verify-sui --intent '<json-or-checkout-url>' --tx-digest H2j... --coin-type 0x...::usdc::USDC --decimals 6 --binding-package-id 0x... --network testnet --json">Copy</button>
              </div>
              <pre><code>zkpay receipt verify-sui \
  --intent '&lt;json-or-checkout-url&gt;' \
  --tx-digest H2j... \
  --coin-type 0x...::usdc::USDC \
  --decimals 6 \
  --binding-package-id 0x... \
  --network testnet \
  --json</code></pre>
            </article>
          </div>
        </section>

        <section class="usecase-section">
          <div class="section-copy centered">
            <p class="eyebrow">Who it is for</p>
            <h2>Built for apps that need payment to feel native, not bolted on.</h2>
          </div>
          <div class="usecase-grid">
            ${renderUseCases()}
          </div>
        </section>

        <section class="policy-section" id="policy">
          <div class="section-copy">
            <p class="eyebrow">Clear gas policy</p>
            <h2>Gasless is a route, not a marketing claim.</h2>
            <p>
              zkpay should be explicit about when the payer pays nothing, when
              the app sponsors gas, and when a fallback is required.
            </p>
          </div>
          <div class="policy-table" aria-label="Gas route policy">
            ${renderRoutePolicy()}
          </div>
        </section>

        <section class="final-section">
          <div>
            <p class="eyebrow">MVP target</p>
            <h2>Close the loop for one Sui testnet stablecoin payment.</h2>
            <p>
              The near-term product is not a dashboard-heavy payment suite. It
              is a working checkout loop: create intent, submit a Sui transfer,
              verify the digest, and only then fulfill the order.
            </p>
          </div>
          <a class="primary-action" href="/docs/npm-release.html">Install zkpay-sh</a>
        </section>
      </main>

      <footer class="footer">
        <span>zkpay</span>
        <span>Sui-native stablecoin checkout infrastructure.</span>
      </footer>
    </div>
  `;

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", copyValue);
  });
}

function renderCheckoutPage() {
  const intent = readIntentFromLocation();
  const gasRoute = intent ? resolveCheckoutGasRoute(intent) : null;
  const expired = intent ? isExpired(intent) : false;

  app.innerHTML = `
    <div class="site-shell">
      ${renderHeader()}
      <main class="checkout-page">
        ${
          intent
            ? `
              <section class="checkout-layout">
                <div class="checkout-copy">
                  <p class="eyebrow">Hosted checkout</p>
                  <h1>${escapeHtml(intent.label)}</h1>
                  <p class="lede">
                    Review the payment intent before authorizing the Sui stablecoin
                    transfer.
                  </p>
                </div>

                <article class="checkout-card">
                  <div class="checkout-amount">
                    <span>Amount</span>
                    <strong>${escapeHtml(intent.amount)} ${escapeHtml(intent.coin)}</strong>
                  </div>
                  <div class="checkout-detail-row">
                    <span>Receiver</span>
                    <strong>${escapeHtml(shortAddress(intent.receiver))}</strong>
                  </div>
                  <div class="checkout-detail-row">
                    <span>Payment ID</span>
                    <strong>${escapeHtml(intent.id)}</strong>
                  </div>
                  <div class="checkout-detail-row">
                    <span>Gas route</span>
                    <strong>${escapeHtml(gasRoute.label)}</strong>
                  </div>
                  ${
                    intent.expiresAt
                      ? `
                        <div class="checkout-detail-row">
                          <span>Expires</span>
                          <strong>${escapeHtml(formatDateTime(intent.expiresAt))}</strong>
                        </div>
                      `
                      : ""
                  }
                  ${renderMetadata(intent.metadata)}
                  <p class="checkout-note">
                    ${expired ? "This payment intent is expired." : escapeHtml(gasRoute.note)}
                  </p>
                  <div class="checkout-runtime" data-checkout-runtime>
                    <p class="checkout-runtime-status" data-state="busy">Loading checkout runtime...</p>
                  </div>
                </article>
              </section>
            `
            : `
              <section class="checkout-empty">
                <p class="eyebrow">Hosted checkout</p>
                <h1>Payment intent missing.</h1>
                <p class="lede">
                  This checkout link does not include a readable zkpay intent
                  payload.
                </p>
                <a class="primary-action" href="/">Back to zkpay</a>
              </section>
            `
        }
      </main>
    </div>
  `;

  if (intent) {
    void bootCheckoutRuntime(intent, expired);
  }
}

function readIntentFromLocation() {
  const url = new URL(window.location.href);
  const payload = url.searchParams.get("intent");

  if (!payload) return null;

  try {
    const intent = JSON.parse(decodeBase64Url(payload));
    const pathId = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "");

    if (!isValidIntent(intent)) return null;
    if (pathId && pathId !== intent.id) return null;

    return intent;
  } catch {
    return null;
  }
}

function decodeBase64Url(payload) {
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = window.atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function isValidIntent(intent) {
  return (
    intent &&
    typeof intent === "object" &&
    /^zkp_[a-zA-Z0-9_-]+$/.test(intent.id) &&
    /^(0|[1-9]\d*)(\.\d+)?$/.test(intent.amount) &&
    typeof intent.coin === "string" &&
    intent.coin.length > 0 &&
    /^0x[0-9a-fA-F]{1,64}$/.test(intent.receiver) &&
    typeof intent.label === "string" &&
    intent.label.length > 0 &&
    typeof intent.nonce === "string" &&
    /^[a-zA-Z0-9_-]{12,96}$/.test(intent.nonce) &&
    Number.isFinite(Date.parse(intent.createdAt)) &&
    (!intent.expiresAt || Number.isFinite(Date.parse(intent.expiresAt))) &&
    (!intent.metadata || typeof intent.metadata === "object")
  );
}

function resolveCheckoutGasRoute(intent) {
  if (supportedGaslessStablecoins.has(intent.coin)) {
    return {
      label: "Gasless candidate",
      note: "This stablecoin is on the gasless route list. The v0.2 wallet handoff still verifies settlement by digest while live route eligibility is hardened.",
    };
  }

  return {
    label: "Sponsor fallback",
    note: "This asset is not on the current gasless stablecoin list, so checkout should use sponsored gas or a clear payer-paid fallback.",
  };
}

function renderMetadata(metadata = {}) {
  const rows = Object.entries(metadata).filter(([, value]) => value);

  if (!rows.length) return "";

  return `
    <div class="checkout-metadata" aria-label="Payment metadata">
      ${rows
        .map(
          ([key, value]) => `
            <div>
              <span>${escapeHtml(formatMetadataKey(key))}</span>
              <strong>${escapeHtml(value)}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function formatMetadataKey(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ");
}

function isExpired(intent) {
  return intent.expiresAt ? Date.parse(intent.expiresAt) <= Date.now() : false;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function bootCheckoutRuntime(intent, expired) {
  const target = document.querySelector("[data-checkout-runtime]");

  if (!target) return;

  try {
    const { mountCheckout } = await import("/checkout.js");
    mountCheckout({
      target,
      intent,
      expired,
      config: readCheckoutConfig(intent),
    });
  } catch (error) {
    target.innerHTML = `
      <p class="checkout-runtime-status" data-state="error">
        Wallet checkout failed to load: ${escapeHtml(error instanceof Error ? error.message : String(error))}
      </p>
    `;
  }
}

function readCheckoutConfig(intent) {
  const url = new URL(window.location.href);
  const network = readCheckoutNetwork(url.searchParams.get("network"));
  const decimals = Number(url.searchParams.get("decimals") ?? 6);

  return {
    network,
    coinType: url.searchParams.get("coinType") ?? (intent.coin.includes("::") ? intent.coin : ""),
    decimals: Number.isInteger(decimals) && decimals >= 0 ? decimals : 6,
    rpcUrl: url.searchParams.get("rpcUrl") ?? "",
    bindingPackageId: url.searchParams.get("bindingPackageId") ?? "",
    bindingEventType: url.searchParams.get("bindingEventType") ?? "",
    signature: url.searchParams.get("signature") ?? "",
  };
}

function readCheckoutNetwork(value) {
  return value === "mainnet" || value === "devnet" || value === "localnet"
    ? value
    : "testnet";
}

function shortAddress(address) {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function copyValue(event) {
  const button = event.currentTarget;
  const original = button.textContent;

  try {
    await navigator.clipboard.writeText(button.dataset.copy);
    button.textContent = "Copied";
  } catch {
    button.textContent = "Failed";
  }

  window.setTimeout(() => {
    button.textContent = original;
  }, 1200);
}

function renderCurrentRoute() {
  if (window.location.pathname.startsWith("/pay/")) {
    renderCheckoutPage();
    return;
  }

  render();
}

renderCurrentRoute();
