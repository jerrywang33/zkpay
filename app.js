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
    body: "Return receipt data that a backend can check against amount, coin, receiver, nonce, and transaction digest.",
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
    body: "Give merchants a deterministic way to verify settlement before unlocking goods, credits, or access.",
    meta: "Digest / nonce / webhook",
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
      <header class="topbar">
        <a class="brand" href="/" aria-label="zkpay home">
          <span class="brand-mark" aria-hidden="true">💧</span>
          <span>zkpay</span>
        </a>
        <nav class="nav" aria-label="Primary navigation">
          <a class="nav-docs" href="https://jerrywang33.github.io/zkpay/" target="_blank" rel="noreferrer">Docs</a>
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
              <a class="primary-action" href="#developers">Start building</a>
              <a class="secondary-action" href="#flow">See the flow</a>
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
            <h2>Create a payment. Send the user to checkout. Verify the receipt.</h2>
            <p>
              Start with payment links and a server-side verification API.
              Keep custody, fulfillment, and business logic in the merchant app.
            </p>
          </div>
          <div class="code-stack">
            <article class="code-panel">
              <div class="code-head">
                <span>Create payment</span>
                <button type="button" data-copy="zkpay link create --amount 20 --coin USDC --receiver 0x...">Copy</button>
              </div>
              <pre><code>zkpay link create
  --amount 20
  --coin USDC
  --receiver 0x...
  --label "API credits"</code></pre>
            </article>
            <article class="code-panel">
              <div class="code-head">
                <span>Verify receipt</span>
                <button type="button" data-copy="await zkpay.verifyPayment('zkp_123')">Copy</button>
              </div>
              <pre><code>const receipt = await zkpay.verifyPayment("zkp_123");

if (receipt.status === "succeeded") {
  await fulfillOrder(receipt.orderId);
}</code></pre>
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
            <h2>Close the loop for one real stablecoin payment.</h2>
            <p>
              The near-term product is not a dashboard-heavy payment suite. It
              is a working checkout loop: create intent, authorize payment,
              settle on Sui, and verify the receipt.
            </p>
          </div>
          <a class="primary-action" href="#developers">Build the first flow</a>
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

render();
