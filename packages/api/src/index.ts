import { Hono } from "hono";
import { z } from "zod";
import {
  ZkpayClient,
  paymentIntentInputSchema,
  paymentIntentSchema,
  paymentReceiptSchema,
  type ZkpayClientOptions,
} from "@zkpay/sdk";

const createPaymentRequestSchema = z.object({
  payment: paymentIntentInputSchema,
  options: z
    .object({
      requiresProgrammableTransaction: z.boolean().optional(),
    })
    .default({}),
});

const verifyPaymentRequestSchema = z.object({
  intent: paymentIntentSchema,
  receipt: paymentReceiptSchema,
  options: z
    .object({
      enforceExpiration: z.boolean().optional(),
      now: z.string().datetime().optional(),
    })
    .default({}),
});

export interface ZkpayApiOptions extends ZkpayClientOptions {}

export function createZkpayApi(options: ZkpayApiOptions = {}): Hono {
  const app = new Hono();
  const client = new ZkpayClient(options);

  app.get("/health", (context) =>
    context.json({
      ok: true,
      service: "zkpay-api",
    }),
  );

  app.post("/payments", async (context) => {
    const payload = createPaymentRequestSchema.safeParse(await context.req.json());

    if (!payload.success) {
      return context.json(
        {
          error: "invalid_payment_request",
          details: payload.error.issues,
        },
        400,
      );
    }

    return context.json(
      client.createPayment(payload.data.payment, payload.data.options),
      201,
    );
  });

  app.post("/payments/verify", async (context) => {
    const payload = verifyPaymentRequestSchema.safeParse(await context.req.json());

    if (!payload.success) {
      return context.json(
        {
          error: "invalid_verification_request",
          details: payload.error.issues,
        },
        400,
      );
    }

    const result = client.verifyPayment(
      payload.data.intent,
      payload.data.receipt,
      payload.data.options,
    );

    return context.json(result, result.ok ? 200 : 422);
  });

  return app;
}
