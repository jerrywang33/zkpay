import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const cliPath = fileURLToPath(new URL("../dist/index.js", import.meta.url));

const intent = {
  id: "zkp_cliwebhook",
  amount: "20",
  coin: "USDC",
  receiver: "0x84f",
  label: "API credits",
  metadata: {},
  nonce: "nonce_cliwebhook",
  createdAt: "2026-05-25T00:00:00.000Z",
};

const receipt = {
  paymentId: intent.id,
  status: "succeeded",
  txDigest: "9T9T9T9T9T9T9T9T",
  amount: intent.amount,
  coin: intent.coin,
  receiver: intent.receiver,
  nonce: intent.nonce,
  settledAt: "2026-05-25T01:00:00.000Z",
};

describe("@zkpay/cli", () => {
  it("signs and verifies webhook sign output", () => {
    const signed = runCli([
      "webhook",
      "sign",
      "--intent",
      JSON.stringify(intent),
      "--receipt",
      JSON.stringify(receipt),
      "--webhook-secret",
      "webhook_secret",
      "--event-id",
      "zkw_cliwebhook",
      "--now",
      "2026-05-25T01:01:00.000Z",
      "--timestamp",
      "1779664860",
      "--source",
      "cli",
      "--json",
    ]);

    expect(signed.status).toBe(0);

    const payload = JSON.parse(signed.stdout);

    expect(payload.event).toMatchObject({
      id: "zkw_cliwebhook",
      type: "payment.succeeded",
      paymentId: intent.id,
      data: {
        source: "cli",
      },
    });
    expect(payload.signatureHeader).toMatch(/^t=1779664860,v1=/);

    const verified = runCli([
      "webhook",
      "verify",
      "--event",
      JSON.stringify(payload),
      "--webhook-secret",
      "webhook_secret",
      "--now",
      "1779664870000",
      "--json",
    ]);

    expect(verified.status).toBe(0);
    expect(JSON.parse(verified.stdout)).toEqual({
      ok: true,
    });
  });
});

function runCli(args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
  });
}
