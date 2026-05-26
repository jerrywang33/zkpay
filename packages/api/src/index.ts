import { Hono } from "hono";
import { z } from "zod";
import {
  SuiReceiptVerifier,
  ZkpayClient,
  paymentIntentInputSchema,
  paymentIntentSchema,
  paymentReceiptSchema,
  type SuiReceiptVerifierOptions,
  type SuiSettlementVerificationInput,
  type SuiSettlementVerificationResult,
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

const verifySuiPaymentRequestSchema = z.object({
  intent: paymentIntentSchema,
  txDigest: z.string().min(16),
  coinType: z.string().min(1).optional(),
  decimals: z.number().int().nonnegative().optional(),
  expectedSender: z.string().min(1).optional(),
  amountPolicy: z.enum(["exact", "at-least"]).optional(),
  options: z
    .object({
      enforceExpiration: z.boolean().optional(),
      now: z.string().datetime().optional(),
    })
    .default({}),
});

export interface SuiVerifier {
  verify(
    input: SuiSettlementVerificationInput,
  ): Promise<SuiSettlementVerificationResult>;
}

export interface ZkpayApiOptions extends ZkpayClientOptions {
  sui?: SuiReceiptVerifierOptions;
  suiVerifier?: SuiVerifier;
}

export function createZkpayApi(options: ZkpayApiOptions = {}): Hono {
  const app = new Hono();
  const client = new ZkpayClient(options);
  const suiVerifier = options.suiVerifier ?? new SuiReceiptVerifier(options.sui);

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

  app.post("/payments/verify/sui", async (context) => {
    const payload = verifySuiPaymentRequestSchema.safeParse(
      await context.req.json(),
    );

    if (!payload.success) {
      return context.json(
        {
          error: "invalid_sui_verification_request",
          details: payload.error.issues,
        },
        400,
      );
    }

    let result;

    try {
      result = await suiVerifier.verify({
        intent: payload.data.intent,
        txDigest: payload.data.txDigest,
        coinType: payload.data.coinType,
        decimals: payload.data.decimals,
        expectedSender: payload.data.expectedSender,
        amountPolicy: payload.data.amountPolicy,
        ...payload.data.options,
      });
    } catch (error) {
      return context.json(
        {
          error: "sui_verification_failed",
          details: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }

    return context.json(result, result.ok ? 200 : 422);
  });

  return app;
}
