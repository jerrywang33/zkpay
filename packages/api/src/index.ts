import { Hono } from "hono";
import { z } from "zod";
import {
  SuiReceiptVerifier,
  ZkpayClient,
  paymentIntentInputSchema,
  paymentIntentSchema,
  paymentReceiptSchema,
  type PaymentIntent,
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
      checkout: z
        .object({
          network: z
            .enum(["mainnet", "testnet", "devnet", "localnet"])
            .optional(),
          coinType: z.string().min(1).optional(),
          decimals: z.number().int().nonnegative().optional(),
          rpcUrl: z.string().min(1).optional(),
          bindingPackageId: z.string().min(1).optional(),
          bindingEventType: z.string().min(1).optional(),
        })
        .optional(),
    })
    .default({}),
});

const verifyPaymentRequestSchema = z.object({
  intent: paymentIntentSchema,
  signature: z.string().min(1).optional(),
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
  signature: z.string().min(1).optional(),
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

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
}

export interface D1SuiReplayStoreOptions {
  tableName?: string;
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

export function createD1SuiReplayStore(
  database: D1DatabaseLike,
  options: D1SuiReplayStoreOptions = {},
): SuiReplayStore {
  const tableName = sqlIdentifier(options.tableName ?? "zkpay_sui_replay");

  return {
    async record(record) {
      try {
        await database
          .prepare(
            `insert into ${tableName} (payment_id, tx_digest, amount, coin, receiver, nonce, settled_at, verified_at) values (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            record.paymentId,
            record.txDigest,
            record.amount,
            record.coin,
            record.receiver,
            record.nonce,
            record.settledAt,
            record.verifiedAt,
          )
          .run();

        return {
          ok: true,
          record,
        };
      } catch (error) {
        const digestRecord = await findD1ReplayRecord(
          database,
          tableName,
          "tx_digest",
          record.txDigest,
        );

        if (digestRecord) {
          return {
            ok: false,
            reason: "digest_already_used",
            existing: digestRecord,
            attempted: record,
          };
        }

        const paymentRecord = await findD1ReplayRecord(
          database,
          tableName,
          "payment_id",
          record.paymentId,
        );

        if (paymentRecord) {
          return {
            ok: false,
            reason: "payment_already_settled",
            existing: paymentRecord,
            attempted: record,
          };
        }

        throw error;
      }
    },
  };
}

export function createD1SuiReplayStoreSchema(
  options: D1SuiReplayStoreOptions = {},
): string {
  const tableName = sqlIdentifier(options.tableName ?? "zkpay_sui_replay");

  return [
    `create table if not exists ${tableName} (`,
    "  payment_id text primary key,",
    "  tx_digest text not null unique,",
    "  amount text not null,",
    "  coin text not null,",
    "  receiver text not null,",
    "  nonce text not null,",
    "  settled_at text not null,",
    "  verified_at text not null",
    ");",
  ].join("\n");
}

export interface ZkpayApiOptions extends ZkpayClientOptions {
  sui?: SuiReceiptVerifierOptions;
  suiVerifier?: SuiVerifier;
  replayStore?: SuiReplayStore | false;
  requireIntentSignature?: boolean;
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

    const signatureError = verifyIntentSignatureBoundary(
      client,
      payload.data.intent,
      payload.data.signature,
      options,
    );

    if (signatureError) {
      return context.json(
        {
          error: signatureError,
        },
        401,
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

    const signatureError = verifyIntentSignatureBoundary(
      client,
      payload.data.intent,
      payload.data.signature,
      options,
    );

    if (signatureError) {
      return context.json(
        {
          error: signatureError,
        },
        401,
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

function verifyIntentSignatureBoundary(
  client: ZkpayClient,
  intent: PaymentIntent,
  signature: string | undefined,
  options: ZkpayApiOptions,
): "payment_intent_signature_missing" | "payment_intent_signature_invalid" | null {
  if (!options.requireIntentSignature && !signature) {
    return null;
  }

  if (!signature) {
    return "payment_intent_signature_missing";
  }

  return client.verifyIntentSignature(intent, signature)
    ? null
    : "payment_intent_signature_invalid";
}

async function findD1ReplayRecord(
  database: D1DatabaseLike,
  tableName: string,
  columnName: "payment_id" | "tx_digest",
  value: string,
): Promise<SuiReplayRecord | null> {
  const row = await database
    .prepare(
      `select payment_id, tx_digest, amount, coin, receiver, nonce, settled_at, verified_at from ${tableName} where ${columnName} = ? limit 1`,
    )
    .bind(value)
    .first<D1SuiReplayRow>();

  return row ? replayRecordFromD1Row(row) : null;
}

interface D1SuiReplayRow {
  payment_id: string;
  tx_digest: string;
  amount: string;
  coin: string;
  receiver: string;
  nonce: string;
  settled_at: string;
  verified_at: string;
}

function replayRecordFromD1Row(row: D1SuiReplayRow): SuiReplayRecord {
  return {
    paymentId: row.payment_id,
    txDigest: row.tx_digest,
    amount: row.amount,
    coin: row.coin,
    receiver: row.receiver,
    nonce: row.nonce,
    settledAt: row.settled_at,
    verifiedAt: row.verified_at,
  };
}

function sqlIdentifier(value: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }

  return value;
}
