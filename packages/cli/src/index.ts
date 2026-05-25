#!/usr/bin/env node
import { ZkpayClient } from "@zkpay/sdk";

const [, , command, subcommand, ...args] = process.argv;

if (command === "link" && subcommand === "create") {
  const values = parseFlags(args);
  const client = new ZkpayClient();
  const payment = client.createPayment({
    amount: required(values.amount, "amount"),
    coin: required(values.coin, "coin"),
    receiver: required(values.receiver, "receiver"),
    label: values.label ?? "zkpay payment",
    metadata: values.orderId ? { orderId: values.orderId } : {},
  });

  console.log(payment.checkoutUrl);
  process.exit(0);
}

console.error("Usage: zkpay link create --amount 20 --coin USDC --receiver 0x...");
process.exit(1);

function parseFlags(args: string[]): Record<string, string> {
  const values: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];

    if (!key?.startsWith("--") || !value) continue;
    values[key.slice(2)] = value;
  }

  return values;
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing --${name}`);
  return value;
}
