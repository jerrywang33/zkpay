import { ZkpayClient, type PaymentReceipt } from "@zkpay/sdk";

const checkout = {
  network: "testnet" as const,
  coinType: "0x2::usdc::USDC",
  decimals: 6,
  bindingPackageId: "0xabc",
};

const zkpay = new ZkpayClient({
  baseUrl: "https://zkpay.sh",
  sponsorEnabled: true,
});

const payment = zkpay.createPayment(
  {
    amount: "20",
    coin: "USDC",
    receiver: "0x84f",
    label: "API credits",
    metadata: {
      orderId: "ord_123",
      customerId: "cus_123",
    },
    expiresAt: "2026-05-26T00:00:00.000Z",
  },
  {
    id: "zkp_demo123",
    nonce: "nonce_demo123",
    now: "2026-05-25T00:00:00.000Z",
    checkout,
  },
);

console.log("Send payer to:", payment.checkoutUrl);
console.log("Route:", payment.gasRoute.kind, payment.gasRoute.reason);

const suiVerifyPayload = {
  intent: payment.intent,
  txDigest: "H2jbnwW7j5T9s2YRJrZupaymentdigest",
  coinType: checkout.coinType,
  decimals: checkout.decimals,
  expectedSender:
    "0x1111111111111111111111111111111111111111111111111111111111111111",
  amountPolicy: "exact",
  binding: {
    packageId: checkout.bindingPackageId,
  },
  options: {
    enforceExpiration: true,
  },
};

console.log(
  "Backend verifies Sui settlement with:",
  JSON.stringify(suiVerifyPayload, null, 2),
);

const receipt: PaymentReceipt = {
  paymentId: payment.intent.id,
  status: "succeeded",
  txDigest: "9T9T9T9T9T9T9T9T",
  amount: payment.intent.amount,
  coin: payment.intent.coin,
  receiver: payment.intent.receiver,
  nonce: payment.intent.nonce,
  settledAt: "2026-05-25T01:00:00.000Z",
};

const verification = zkpay.verifyPayment(payment.intent, receipt, {
  enforceExpiration: true,
  now: "2026-05-25T01:01:00.000Z",
});

if (!verification.ok) {
  throw new Error(`Receipt verification failed: ${verification.errors.join(", ")}`);
}

console.log("Fulfill order:", payment.intent.metadata.orderId);
