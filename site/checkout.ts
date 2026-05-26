import { getWallets } from "@wallet-standard/app";
import {
  SUI_DEVNET_CHAIN,
  SUI_LOCALNET_CHAIN,
  SUI_MAINNET_CHAIN,
  SUI_TESTNET_CHAIN,
  signAndExecuteTransaction,
  type Wallet,
  type WalletAccount,
} from "@mysten/wallet-standard";
import {
  SuiJsonRpcClient,
  getJsonRpcFullnodeUrl,
  type BalanceChange,
  type CoinStruct,
  type SuiTransactionBlockResponse,
} from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";

type SuiNetwork = "mainnet" | "testnet" | "devnet" | "localnet";
type CheckoutStateKind = "info" | "busy" | "ok" | "error";

interface PaymentIntent {
  id: string;
  amount: string;
  coin: string;
  receiver: string;
  label: string;
  metadata?: Record<string, unknown>;
  nonce: string;
  createdAt: string;
  expiresAt?: string;
}

interface CheckoutConfig {
  network: SuiNetwork;
  coinType: string;
  decimals: number;
  rpcUrl: string;
}

interface MountCheckoutInput {
  target: HTMLElement;
  intent: PaymentIntent;
  expired: boolean;
  config: CheckoutConfig;
}

interface CheckoutState extends CheckoutConfig {
  wallets: Wallet[];
  selectedWalletName: string;
  account: WalletAccount | null;
  digest: string;
  verification: VerificationResult | null;
  status: {
    kind: CheckoutStateKind;
    message: string;
  };
}

interface VerificationResult {
  ok: boolean;
  errors: string[];
  status: string;
  receiverDelta: string;
  senderDelta?: string;
  amountAtomic: string;
}

const EXECUTE_FEATURES = [
  "sui:signAndExecuteTransaction",
  "sui:signAndExecuteTransactionBlock",
] as const;

const NETWORK_CHAINS = {
  mainnet: SUI_MAINNET_CHAIN,
  testnet: SUI_TESTNET_CHAIN,
  devnet: SUI_DEVNET_CHAIN,
  localnet: SUI_LOCALNET_CHAIN,
} as const satisfies Record<SuiNetwork, `${string}:${string}`>;

export function mountCheckout({
  target,
  intent,
  expired,
  config,
}: MountCheckoutInput): void {
  const walletApi = getWallets();
  const state: CheckoutState = {
    ...config,
    wallets: [],
    selectedWalletName: "",
    account: null,
    digest: "",
    verification: null,
    status: expired
      ? {
          kind: "error",
          message: "This payment intent is expired. Create a fresh checkout link.",
        }
      : {
          kind: "info",
          message: "Connect a Sui wallet to submit this testnet settlement transaction.",
        },
  };

  const refreshWallets = () => {
    state.wallets = walletApi
      .get()
      .filter((wallet) => isSuiExecutionWallet(wallet, state.network));

    if (!state.selectedWalletName && state.wallets[0]) {
      state.selectedWalletName = state.wallets[0].name;
    }

    if (
      state.selectedWalletName &&
      !state.wallets.some((wallet) => wallet.name === state.selectedWalletName)
    ) {
      state.selectedWalletName = state.wallets[0]?.name ?? "";
      state.account = null;
    }

    render();
  };

  walletApi.on("register", refreshWallets);
  walletApi.on("unregister", refreshWallets);

  refreshWallets();

  function render() {
    const selectedWallet = getSelectedWallet();
    const verifyPayload = buildVerifyPayload(intent, state);
    const canConnect = !expired && Boolean(selectedWallet);
    const canPay =
      canConnect &&
      Boolean(state.account) &&
      Boolean(state.coinType.trim()) &&
      Number.isInteger(state.decimals) &&
      state.decimals >= 0;
    const manualDigest = state.digest || "";

    target.innerHTML = `
      <section class="checkout-runtime-panel" aria-label="Wallet payment">
        <div class="checkout-runtime-head">
          <div>
            <span>Wallet handoff</span>
            <strong>${escapeHtml(state.network)} settlement</strong>
          </div>
          <span class="checkout-runtime-badge">v0.2 alpha</span>
        </div>

        <div class="checkout-runtime-grid">
          <label class="checkout-field">
            <span>Network</span>
            <select data-field="network" ${expired ? "disabled" : ""}>
              ${renderNetworkOptions(state.network)}
            </select>
          </label>
          <label class="checkout-field">
            <span>Decimals</span>
            <input data-field="decimals" inputmode="numeric" value="${escapeHtml(state.decimals)}" ${expired ? "disabled" : ""} />
          </label>
        </div>

        <label class="checkout-field">
          <span>Coin type</span>
          <input
            data-field="coinType"
            placeholder="0x...::usdc::USDC"
            value="${escapeHtml(state.coinType)}"
            ${expired ? "disabled" : ""}
          />
        </label>

        <label class="checkout-field">
          <span>RPC URL</span>
          <input
            data-field="rpcUrl"
            placeholder="${escapeHtml(getJsonRpcFullnodeUrl(state.network))}"
            value="${escapeHtml(state.rpcUrl)}"
            ${expired ? "disabled" : ""}
          />
        </label>

        <div class="checkout-wallet-row">
          <label class="checkout-field">
            <span>Wallet</span>
            <select data-field="wallet" ${expired || !state.wallets.length ? "disabled" : ""}>
              ${
                state.wallets.length
                  ? state.wallets
                      .map(
                        (wallet) =>
                          `<option value="${escapeHtml(wallet.name)}" ${
                            wallet.name === state.selectedWalletName ? "selected" : ""
                          }>${escapeHtml(wallet.name)}</option>`,
                      )
                      .join("")
                  : `<option>No Sui wallet detected</option>`
              }
            </select>
          </label>
          <button type="button" data-action="refresh-wallets">Refresh</button>
        </div>

        ${
          state.account
            ? `<p class="checkout-account">Connected: <strong>${escapeHtml(shortAddress(state.account.address))}</strong></p>`
            : ""
        }

        <div class="checkout-runtime-actions">
          <button type="button" data-action="connect-wallet" ${canConnect ? "" : "disabled"}>Connect wallet</button>
          <button type="button" data-action="pay-wallet" ${canPay ? "" : "disabled"}>Pay and return digest</button>
        </div>

        <div class="checkout-digest-row">
          <label class="checkout-field">
            <span>Transaction digest</span>
            <input data-field="digest" placeholder="Paste digest to verify manually" value="${escapeHtml(manualDigest)}" />
          </label>
          <button type="button" data-action="verify-digest" ${state.digest ? "" : "disabled"}>Verify</button>
        </div>

        <p class="checkout-runtime-status" data-state="${state.status.kind}">
          ${escapeHtml(state.status.message)}
        </p>

        ${renderVerification(state.verification)}
        ${verifyPayload ? renderVerifyPayload(verifyPayload) : ""}
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    const syncActionState = () => {
      const payButton = target.querySelector<HTMLButtonElement>(
        '[data-action="pay-wallet"]',
      );
      const verifyButton = target.querySelector<HTMLButtonElement>(
        '[data-action="verify-digest"]',
      );

      if (payButton) {
        payButton.disabled =
          expired ||
          !getSelectedWallet() ||
          !state.account ||
          !state.coinType.trim() ||
          !Number.isInteger(state.decimals) ||
          state.decimals < 0;
      }

      if (verifyButton) {
        verifyButton.disabled = !state.digest;
      }
    };

    target
      .querySelector<HTMLSelectElement>('[data-field="network"]')
      ?.addEventListener("change", (event) => {
        state.network = readNetwork((event.currentTarget as HTMLSelectElement).value);
        state.account = null;
        state.verification = null;
        refreshWallets();
      });

    target
      .querySelector<HTMLInputElement>('[data-field="coinType"]')
      ?.addEventListener("input", (event) => {
        state.coinType = (event.currentTarget as HTMLInputElement).value.trim();
        syncActionState();
      });

    target
      .querySelector<HTMLInputElement>('[data-field="decimals"]')
      ?.addEventListener("input", (event) => {
        const value = Number((event.currentTarget as HTMLInputElement).value);
        state.decimals = Number.isInteger(value) ? value : Number.NaN;
        syncActionState();
      });

    target
      .querySelector<HTMLInputElement>('[data-field="rpcUrl"]')
      ?.addEventListener("input", (event) => {
        state.rpcUrl = (event.currentTarget as HTMLInputElement).value.trim();
      });

    target
      .querySelector<HTMLSelectElement>('[data-field="wallet"]')
      ?.addEventListener("change", (event) => {
        state.selectedWalletName = (event.currentTarget as HTMLSelectElement).value;
        state.account = null;
        state.verification = null;
        render();
      });

    target
      .querySelector<HTMLInputElement>('[data-field="digest"]')
      ?.addEventListener("input", (event) => {
        state.digest = (event.currentTarget as HTMLInputElement).value.trim();
        syncActionState();
      });

    target
      .querySelector<HTMLButtonElement>('[data-action="refresh-wallets"]')
      ?.addEventListener("click", refreshWallets);

    target
      .querySelector<HTMLButtonElement>('[data-action="connect-wallet"]')
      ?.addEventListener("click", () => void connectWallet());

    target
      .querySelector<HTMLButtonElement>('[data-action="pay-wallet"]')
      ?.addEventListener("click", () => void payWithWallet());

    target
      .querySelector<HTMLButtonElement>('[data-action="verify-digest"]')
      ?.addEventListener("click", () => void verifyDigest());

    target
      .querySelector<HTMLButtonElement>('[data-action="copy-verify-payload"]')
      ?.addEventListener("click", () => void copyVerifyPayload());
  }

  function getSelectedWallet(): Wallet | undefined {
    return state.wallets.find((wallet) => wallet.name === state.selectedWalletName);
  }

  async function connectWallet() {
    const wallet = getSelectedWallet();

    if (!wallet) {
      setStatus("error", "No compatible Sui wallet was detected.");
      return;
    }

    try {
      setStatus("busy", `Requesting access from ${wallet.name}...`);
      const connect = getConnectFeature(wallet);
      const output = await connect.connect();
      const chain = NETWORK_CHAINS[state.network];
      const account =
        output.accounts.find((item) => item.chains.includes(chain)) ??
        wallet.accounts.find((item) => item.chains.includes(chain)) ??
        output.accounts[0] ??
        wallet.accounts[0] ??
        null;

      if (!account) {
        throw new Error(`${wallet.name} did not return a Sui account for ${state.network}.`);
      }

      state.account = account;
      setStatus("ok", `Connected ${shortAddress(account.address)} on ${state.network}.`);
    } catch (error) {
      state.account = null;
      setStatus("error", readableError(error));
    }
  }

  async function payWithWallet() {
    const wallet = getSelectedWallet();

    if (!wallet || !state.account) {
      setStatus("error", "Connect a wallet before submitting payment.");
      return;
    }

    if (!state.coinType.trim()) {
      setStatus("error", "Coin type is required when the intent uses a symbol like USDC.");
      return;
    }

    try {
      setStatus("busy", "Building the Sui transfer transaction...");
      const client = createSuiClient(state);
      const { transaction, amountAtomic } = await buildCoinObjectPaymentTransaction(
        client,
        intent,
        state.account.address,
        state.coinType.trim(),
        state.decimals,
      );

      setStatus("busy", "Waiting for wallet signature and execution...");
      const result = await signAndExecuteTransaction(wallet as never, {
        account: state.account,
        chain: NETWORK_CHAINS[state.network],
        transaction,
      });

      state.digest = result.digest;
      setStatus(
        "busy",
        `Digest returned: ${shortDigest(result.digest)}. Verifying receiver delta...`,
      );
      await verifyDigest(amountAtomic);
    } catch (error) {
      setStatus("error", readableError(error));
    }
  }

  async function verifyDigest(precomputedAmountAtomic?: string) {
    if (!state.digest) {
      setStatus("error", "Paste or submit a transaction digest first.");
      return;
    }

    if (!state.coinType.trim()) {
      setStatus("error", "Coin type is required before verification.");
      return;
    }

    try {
      setStatus("busy", "Checking transaction effects through Sui RPC...");
      const client = createSuiClient(state);
      const amountAtomic =
        precomputedAmountAtomic ?? decimalToAtomicAmount(intent.amount, state.decimals);
      const tx = await client.getTransactionBlock({
        digest: state.digest,
        options: {
          showBalanceChanges: true,
          showEffects: true,
          showInput: true,
        },
      });
      const verification = verifyTransaction(tx, intent, {
        coinType: state.coinType.trim(),
        amountAtomic,
        expectedSender: state.account?.address,
      });

      state.verification = verification;
      setStatus(
        verification.ok ? "ok" : "error",
        verification.ok
          ? "Payment verified. Send the payload to /payments/verify/sui before fulfillment."
          : `Verification failed: ${verification.errors.join(", ")}.`,
      );
    } catch (error) {
      setStatus("error", readableError(error));
    }
  }

  async function copyVerifyPayload() {
    const payload = buildVerifyPayload(intent, state);

    if (!payload) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setStatus("ok", "Verification payload copied.");
    } catch {
      setStatus("error", "Clipboard access failed.");
    }
  }

  function setStatus(kind: CheckoutStateKind, message: string) {
    state.status = { kind, message };
    render();
  }
}

function buildCoinObjectPaymentTransaction(
  client: SuiJsonRpcClient,
  intent: PaymentIntent,
  payer: string,
  coinType: string,
  decimals: number,
): Promise<{ transaction: Transaction; amountAtomic: string }> {
  return (async () => {
    const amountAtomic = decimalToAtomicAmount(intent.amount, decimals);
    const coins = await collectCoins(client, payer, coinType, BigInt(amountAtomic));
    const transaction = new Transaction();
    const primary = transaction.objectRef(toObjectRef(coins[0]));
    const mergeSources = coins.slice(1).map((coin) => transaction.objectRef(toObjectRef(coin)));

    transaction.setSender(payer);

    if (mergeSources.length) {
      transaction.mergeCoins(primary, mergeSources);
    }

    const [paymentCoin] = transaction.splitCoins(primary, [amountAtomic]);
    transaction.transferObjects([paymentCoin], intent.receiver);

    return { transaction, amountAtomic };
  })();
}

async function collectCoins(
  client: SuiJsonRpcClient,
  owner: string,
  coinType: string,
  requiredAmount: bigint,
): Promise<CoinStruct[]> {
  const coins: CoinStruct[] = [];
  let total = 0n;
  let cursor: string | null | undefined;

  do {
    const page = await client.getCoins({
      owner,
      coinType,
      cursor,
      limit: 50,
    });

    for (const coin of page.data) {
      coins.push(coin);
      total += BigInt(coin.balance);

      if (total >= requiredAmount) return coins;
    }

    cursor = page.nextCursor;
  } while (cursor);

  throw new Error(
    `Insufficient ${coinType} balance. Need ${requiredAmount.toString()} atomic units, found ${total.toString()}.`,
  );
}

function verifyTransaction(
  tx: SuiTransactionBlockResponse,
  intent: PaymentIntent,
  options: {
    coinType: string;
    amountAtomic: string;
    expectedSender?: string;
  },
): VerificationResult {
  const errors: string[] = [];
  const status = tx.effects?.status?.status ?? "unknown";

  if (status !== "success") {
    errors.push("transaction_failed");
  }

  const receiverDelta = sumBalanceChanges(tx.balanceChanges, intent.receiver, options.coinType);

  if (receiverDelta <= 0n) {
    errors.push("receiver_payment_missing");
  } else if (receiverDelta !== BigInt(options.amountAtomic)) {
    errors.push("amount_mismatch");
  }

  const senderDelta = options.expectedSender
    ? sumBalanceChanges(tx.balanceChanges, options.expectedSender, options.coinType)
    : undefined;

  if (options.expectedSender && (!senderDelta || senderDelta >= 0n)) {
    errors.push("sender_mismatch");
  }

  return {
    ok: errors.length === 0,
    errors,
    status,
    receiverDelta: receiverDelta.toString(),
    senderDelta: senderDelta?.toString(),
    amountAtomic: options.amountAtomic,
  };
}

function buildVerifyPayload(intent: PaymentIntent, state: CheckoutState) {
  if (!state.digest || !state.coinType.trim()) return null;

  return {
    intent,
    txDigest: state.digest,
    coinType: state.coinType.trim(),
    decimals: state.decimals,
    expectedSender: state.account?.address,
    amountPolicy: "exact",
    options: {
      enforceExpiration: true,
    },
  };
}

function createSuiClient(state: CheckoutState): SuiJsonRpcClient {
  return new SuiJsonRpcClient({
    network: state.network,
    url: state.rpcUrl || getJsonRpcFullnodeUrl(state.network),
  });
}

function isSuiExecutionWallet(wallet: Wallet, network: SuiNetwork): boolean {
  const chain = NETWORK_CHAINS[network];
  const hasChain = wallet.chains.includes(chain);
  const hasConnect = Boolean(wallet.features["standard:connect"]);
  const hasExecute = EXECUTE_FEATURES.some((feature) => Boolean(wallet.features[feature]));

  return hasChain && hasConnect && hasExecute;
}

function getConnectFeature(wallet: Wallet): {
  connect(): Promise<{ accounts: readonly WalletAccount[] }>;
} {
  const feature = wallet.features["standard:connect"] as
    | { connect(): Promise<{ accounts: readonly WalletAccount[] }> }
    | undefined;

  if (!feature) {
    throw new Error(`${wallet.name} does not expose standard:connect.`);
  }

  return feature;
}

function toObjectRef(coin: CoinStruct) {
  return {
    objectId: coin.coinObjectId,
    version: coin.version,
    digest: coin.digest,
  };
}

function decimalToAtomicAmount(amount: string, decimals: number): string {
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(amount)) {
    throw new Error("Expected a positive decimal amount.");
  }

  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error("Expected decimals to be a non-negative integer.");
  }

  const [whole, fraction = ""] = amount.split(".");

  if (fraction.length > decimals) {
    throw new Error("Amount has more decimal places than this coin supports.");
  }

  const scale = 10n ** BigInt(decimals);
  const wholeAtomic = BigInt(whole) * scale;
  const fractionAtomic = BigInt(fraction.padEnd(decimals, "0") || "0");

  return (wholeAtomic + fractionAtomic).toString();
}

function sumBalanceChanges(
  changes: BalanceChange[] | null | undefined,
  owner: string,
  coinType: string,
): bigint {
  return (changes ?? []).reduce((total, change) => {
    if (!sameCoinType(change.coinType, coinType)) return total;
    if (!sameAddress(ownerAddress(change.owner), owner)) return total;
    return total + BigInt(change.amount);
  }, 0n);
}

function ownerAddress(owner: BalanceChange["owner"]): string | null {
  if (typeof owner === "string") return null;
  if ("AddressOwner" in owner) return owner.AddressOwner;
  if ("ConsensusAddressOwner" in owner) return owner.ConsensusAddressOwner.owner;
  return null;
}

function sameAddress(left: string | null, right: string): boolean {
  return left?.toLowerCase() === right.toLowerCase();
}

function sameCoinType(left: string, right: string): boolean {
  return left === right || left.toLowerCase() === right.toLowerCase();
}

function readNetwork(value: string): SuiNetwork {
  return value === "mainnet" || value === "devnet" || value === "localnet"
    ? value
    : "testnet";
}

function renderNetworkOptions(selected: SuiNetwork): string {
  return (["testnet", "mainnet", "devnet", "localnet"] as const)
    .map(
      (network) =>
        `<option value="${network}" ${network === selected ? "selected" : ""}>${network}</option>`,
    )
    .join("");
}

function renderVerification(result: VerificationResult | null): string {
  if (!result) return "";

  return `
    <div class="checkout-result" data-state="${result.ok ? "ok" : "error"}">
      <span>${result.ok ? "Verified" : "Not verified"}</span>
      <dl>
        <div><dt>Status</dt><dd>${escapeHtml(result.status)}</dd></div>
        <div><dt>Expected</dt><dd>${escapeHtml(result.amountAtomic)}</dd></div>
        <div><dt>Receiver delta</dt><dd>${escapeHtml(result.receiverDelta)}</dd></div>
        ${
          result.senderDelta
            ? `<div><dt>Sender delta</dt><dd>${escapeHtml(result.senderDelta)}</dd></div>`
            : ""
        }
      </dl>
      ${
        result.errors.length
          ? `<p>${escapeHtml(result.errors.join(", "))}</p>`
          : ""
      }
    </div>
  `;
}

function renderVerifyPayload(payload: unknown): string {
  return `
    <div class="checkout-payload">
      <div>
        <span>Backend verify payload</span>
        <button type="button" data-action="copy-verify-payload">Copy</button>
      </div>
      <pre><code>${escapeHtml(JSON.stringify(payload, null, 2))}</code></pre>
    </div>
  `;
}

function shortAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function shortDigest(digest: string): string {
  if (digest.length <= 18) return digest;
  return `${digest.slice(0, 8)}...${digest.slice(-6)}`;
}

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
