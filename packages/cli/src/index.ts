#!/usr/bin/env node
import { ZkpayClient } from "@zkpay/sdk";

const [, , command, subcommand, ...args] = process.argv;

try {
  if (command === "link" && subcommand === "create") {
    const values = parseFlags(args);
    if (values.help === "true") {
      printUsage();
      process.exit(0);
    }
    const client = new ZkpayClient({
      baseUrl: values["base-url"] ?? "https://zkpay.sh",
      sponsorEnabled: values.sponsor !== "false",
      signingSecret: readSigningSecret(values),
    });
    const payment = client.createPayment(
      {
        amount: required(values.amount, "amount"),
        coin: required(values.coin, "coin"),
        receiver: required(values.receiver, "receiver"),
        label: values.label ?? "zkpay payment",
        metadata: values["order-id"] ? { orderId: values["order-id"] } : {},
        expiresAt: values["expires-at"],
      },
      {
        requiresProgrammableTransaction: values.ptb === "true",
        checkout: buildCheckoutOptions(values),
      },
    );

    if (values.json === "true") {
      console.log(JSON.stringify(payment, null, 2));
    } else {
      console.log(payment.checkoutUrl);
    }

    process.exit(0);
  }

  if (command === "receipt" && subcommand === "verify-sui") {
    const values = parseFlags(args);
    if (values.help === "true") {
      printUsage();
      process.exit(0);
    }
    const client = new ZkpayClient({
      baseUrl: values["base-url"] ?? "https://zkpay.sh",
      sui: {
        network: (values.network as "mainnet" | "testnet" | "devnet" | "localnet") ??
          "testnet",
        rpcUrl: values["rpc-url"],
      },
    });
    const intent = parseIntent(values.intent);
    const result = await client.verifySuiPayment({
      intent,
      txDigest: required(values["tx-digest"], "tx-digest"),
      coinType: values["coin-type"],
      decimals: values.decimals ? Number(values.decimals) : undefined,
      expectedSender: values.sender,
      amountPolicy: values["amount-policy"] === "at-least" ? "at-least" : "exact",
      binding: values["binding-package-id"]
        ? {
            packageId: values["binding-package-id"],
            module: values["binding-module"],
            eventName: values["binding-event-name"],
            eventType: values["binding-event-type"],
          }
        : undefined,
      enforceExpiration: values["enforce-expiration"] === "true",
    });

    if (values.json === "true") {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result.ok ? "verified" : `failed: ${result.errors.join(", ")}`);
    }

    process.exit(result.ok ? 0 : 1);
  }

  if (command === "intent" && subcommand === "verify-signature") {
    const values = parseFlags(args);
    if (values.help === "true") {
      printUsage();
      process.exit(0);
    }
    const client = new ZkpayClient({
      signingSecret: required(
        readSigningSecret(values),
        "signing-secret or ZKPAY_SIGNING_SECRET",
      ),
    });
    const request = parseIntentRequest(values.intent);
    const signature = values.signature ?? request.signature;
    const ok = signature
      ? client.verifyIntentSignature(request.intent, signature)
      : false;

    if (values.json === "true") {
      console.log(
        JSON.stringify(
          {
            ok,
            signature: signature ?? null,
          },
          null,
          2,
        ),
      );
    } else {
      console.log(ok ? "verified" : "invalid");
    }

    process.exit(ok ? 0 : 1);
  }

  printUsage();
  process.exit(1);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function parseFlags(args: string[]): Record<string, string> {
  const values: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];

    if (!key?.startsWith("--")) continue;

    const next = args[index + 1];
    const normalizedKey = key.slice(2);

    if (!next || next.startsWith("--")) {
      values[normalizedKey] = "true";
      continue;
    }

    values[normalizedKey] = next;
    index += 1;
  }

  return values;
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing --${name}`);
  return value;
}

function parseIntent(value: string | undefined) {
  return parseIntentRequest(value).intent;
}

function parseIntentRequest(value: string | undefined) {
  const raw = required(value, "intent");
  const client = new ZkpayClient();

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return client.parseCheckoutRequest(raw);
  }

  const parsed = JSON.parse(raw);

  if (parsed.intent) {
    return {
      intent: parsed.intent,
      signature: parsed.signature,
    };
  }

  return {
    intent: parsed,
    signature: undefined,
  };
}

function buildCheckoutOptions(values: Record<string, string>) {
  const hasCheckoutOptions =
    values.network ||
    values["coin-type"] ||
    values.decimals ||
    values["rpc-url"] ||
    values["binding-package-id"] ||
    values["binding-event-type"];

  if (!hasCheckoutOptions) return undefined;

  return {
    network: values.network as "mainnet" | "testnet" | "devnet" | "localnet",
    coinType: values["coin-type"],
    decimals: values.decimals ? Number(values.decimals) : undefined,
    rpcUrl: values["rpc-url"],
    bindingPackageId: values["binding-package-id"],
    bindingEventType: values["binding-event-type"],
  };
}

function printUsage(): void {
  console.error(
    [
      "Usage:",
      "  zkpay link create --amount 20 --coin USDC --receiver 0x...",
      "  zkpay intent verify-signature --intent '<json-or-checkout-url>'",
      "  zkpay receipt verify-sui --intent '<json-or-checkout-url>' --tx-digest <digest> --coin-type <type> --decimals 6",
      "",
      "Options:",
      "  --label <text>        Payment label",
      "  --order-id <id>       Merchant order id metadata",
      "  --base-url <url>      Hosted checkout base URL",
      "  --expires-at <iso>    Optional expiry timestamp",
      "  --ptb                Mark checkout as programmable transaction",
      "  --sponsor false      Disable sponsor fallback",
      "  --signing-secret <s> Sign hosted checkout URL; prefer ZKPAY_SIGNING_SECRET",
      "  --signature <s>      Payment intent signature for intent verification",
      "  --network <name>      Sui network for checkout or receipt verification",
      "  --coin-type <type>    Sui coin type for checkout or receipt verification",
      "  --decimals <n>        Sui coin decimals for checkout or receipt verification",
      "  --rpc-url <url>       Override Sui RPC URL",
      "  --sender <address>    Expected payer address",
      "  --amount-policy <x>   exact or at-least",
      "  --binding-package-id <id> Require zkpay receipt binding event package",
      "  --binding-module <name> Override binding Move module name",
      "  --binding-event-name <n> Override binding event struct name",
      "  --binding-event-type <t> Override expected binding event type",
      "  --json               Print full payment object",
    ].join("\n"),
  );
}

function readSigningSecret(values: Record<string, string>): string | undefined {
  return values["signing-secret"] ?? process.env.ZKPAY_SIGNING_SECRET;
}
