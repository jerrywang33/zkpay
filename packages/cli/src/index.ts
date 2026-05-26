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
  const raw = required(value, "intent");

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return new ZkpayClient().parseCheckoutUrl(raw);
  }

  return JSON.parse(raw);
}

function printUsage(): void {
  console.error(
    [
      "Usage:",
      "  zkpay link create --amount 20 --coin USDC --receiver 0x...",
      "  zkpay receipt verify-sui --intent '<json-or-checkout-url>' --tx-digest <digest> --coin-type <type> --decimals 6",
      "",
      "Options:",
      "  --label <text>        Payment label",
      "  --order-id <id>       Merchant order id metadata",
      "  --base-url <url>      Hosted checkout base URL",
      "  --expires-at <iso>    Optional expiry timestamp",
      "  --ptb                Mark checkout as programmable transaction",
      "  --sponsor false      Disable sponsor fallback",
      "  --network <name>      Sui network for receipt verification",
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
