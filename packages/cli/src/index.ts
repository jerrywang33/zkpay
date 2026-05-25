#!/usr/bin/env node
import { ZkpayClient } from "@zkpay/sdk";

const [, , command, subcommand, ...args] = process.argv;

try {
  if (command === "link" && subcommand === "create") {
    const values = parseFlags(args);
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

function printUsage(): void {
  console.error(
    [
      "Usage:",
      "  zkpay link create --amount 20 --coin USDC --receiver 0x...",
      "",
      "Options:",
      "  --label <text>        Payment label",
      "  --order-id <id>       Merchant order id metadata",
      "  --base-url <url>      Hosted checkout base URL",
      "  --expires-at <iso>    Optional expiry timestamp",
      "  --ptb                Mark checkout as programmable transaction",
      "  --sponsor false      Disable sponsor fallback",
      "  --json               Print full payment object",
    ].join("\n"),
  );
}
