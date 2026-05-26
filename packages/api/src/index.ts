import { Hono } from "hono";
import { z } from "zod";
import {
  SuiReceiptVerifier,
  ZkpayClient,
  paymentIntentInputSchema,
  paymentIntentSchema,
  paymentReceiptSchema,
  type PaymentReceipt,
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
  binding: z
    .object({
      packageId: z.string().min(1),
      module: z.string().min(1).optional(),
      functionName: z.string().min(1).optional(),
      eventName: z.string().min(1).optional(),
      eventType: z.string().min(1).optional(),
    })
    .optional(),
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

export type SuiReplayReason = "digest_already_used" | "payment_already_settled";

export interface SuiReplayRecord {
  paymentId: string;
  txDigest: string;
  amount: string;
  coin: string;
  receiver: string;
  nonce: string;
  settledAt: string;
  verifiedAt: string;
}

export type SuiReplayDecision =
  | {
      ok: true;
      record: SuiReplayRecord;
    }
  | {
      ok: false;
      reason: SuiReplayReason;
      existing: SuiReplayRecord;
      attempted: SuiReplayRecord;
    };

export interface SuiReplayStore {
  record(record: SuiReplayRecord): Promise<SuiReplayDecision> | SuiReplayDecision;
}

export class InMemorySuiReplayStore implements SuiReplayStore {
  private readonly byDigest = new Map<string, SuiReplayRecord>();
  private readonly byPaymentId = new Map<string, SuiReplayRecord>();

  record(record: SuiReplayRecord): SuiReplayDecision {
    const digestRecord = this.byDigest.get(record.txDigest);

    if (digestRecord) {
      return {
        ok: false,
        reason: "digest_already_used",
        existing: digestRecord,
        attempted: record,
      };
    }

    const paymentRecord = this.byPaymentId.get(record.paymentId);

    if (paymentRecord) {
      return {
        ok: false,
        reason: "payment_already_settled",
        existing: paymentRecord,
        attempted: record,
      };
    }

    this.byDigest.set(record.txDigest, record);
    this.byPaymentId.set(record.paymentId, record);

    return {
      ok: true,
      record,
    };
  }
}

export interface ZkpayApiOptions extends ZkpayClientOptions {
  sui?: SuiReceiptVerifierOptions;
  suiVerifier?: SuiVerifier;
  replayStore?: SuiReplayStore | false;
}

export function createZkpayApi(options: ZkpayApiOptions = {}): Hono {
  const app = new Hono();
  const client = new ZkpayClient(options);
  const suiVerifier = options.suiVerifier ?? new SuiReceiptVerifier(options.sui);
  const replayStore =
    options.replayStore === undefined
      ? new InMemorySuiReplayStore()
      : options.replayStore;

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
        binding: payload.data.binding,
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

    if (result.ok && result.receipt && replayStore) {
      let replay;

      try {
        replay = await replayStore.record(createReplayRecord(result.receipt));
      } catch (error) {
        return context.json(
          {
            error: "sui_replay_store_failed",
            details: error instanceof Error ? error.message : String(error),
          },
          502,
        );
      }

      if (!replay.ok) {
        return context.json(
          {
            ...result,
            ok: false,
            errors: [...result.errors, replay.reason],
            replay,
          },
          409,
        );
      }

      return context.json(
        {
          ...result,
          replay,
        },
        200,
      );
    }

    return context.json(result, result.ok ? 200 : 422);
  });

  return app;
}

function createReplayRecord(receipt: PaymentReceipt): SuiReplayRecord {
  return {
    paymentId: receipt.paymentId,
    txDigest: receipt.txDigest,
    amount: receipt.amount,
    coin: receipt.coin,
    receiver: receipt.receiver,
    nonce: receipt.nonce,
    settledAt: receipt.settledAt,
    verifiedAt: new Date().toISOString(),
  };
}
