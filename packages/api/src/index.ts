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
  type WebhookEvent,
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

const webhookDeliveryListQuerySchema = z.object({
  paymentId: z.string().min(1).optional(),
  eventId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
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
  all?<T = unknown>(): Promise<D1ResultLike<T> | T[]>;
  run(): Promise<unknown>;
}

export interface D1ResultLike<T = unknown> {
  results: T[];
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

export interface WebhookDeliveryStoreOptions {
  tableName?: string;
}

export interface WebhookDeliveryRecord {
  eventId: string;
  paymentId: string;
  eventType: string;
  targetUrl?: string;
  ok: boolean;
  status?: number;
  attemptCount: number;
  error?: string;
  completedAt: string;
}

export interface WebhookDeliveryListInput {
  paymentId?: string;
  eventId?: string;
  limit?: number;
}

export interface WebhookDeliveryStore {
  record(
    record: WebhookDeliveryRecord,
  ): Promise<void> | void;
  list?(
    input?: WebhookDeliveryListInput,
  ): Promise<WebhookDeliveryRecord[]> | WebhookDeliveryRecord[];
}

export class InMemoryWebhookDeliveryStore implements WebhookDeliveryStore {
  readonly records: WebhookDeliveryRecord[] = [];

  record(record: WebhookDeliveryRecord): void {
    this.records.push(record);
  }

  list(input: WebhookDeliveryListInput = {}): WebhookDeliveryRecord[] {
    const limit = normalizeWebhookDeliveryLimit(input.limit);

    return this.records
      .filter((record) =>
        input.paymentId ? record.paymentId === input.paymentId : true,
      )
      .filter((record) =>
        input.eventId ? record.eventId === input.eventId : true,
      )
      .sort((left, right) =>
        right.completedAt.localeCompare(left.completedAt),
      )
      .slice(0, limit);
  }
}

export function createD1WebhookDeliveryStore(
  database: D1DatabaseLike,
  options: WebhookDeliveryStoreOptions = {},
): WebhookDeliveryStore {
  const tableName = sqlIdentifier(options.tableName ?? "zkpay_webhook_delivery");

  return {
    async record(record) {
      await database
        .prepare(
          `insert into ${tableName} (event_id, payment_id, event_type, target_url, ok, status, attempt_count, error, completed_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.eventId,
          record.paymentId,
          record.eventType,
          record.targetUrl ?? null,
          record.ok ? 1 : 0,
          record.status ?? null,
          record.attemptCount,
          record.error ?? null,
          record.completedAt,
        )
        .run();
    },
    async list(input = {}) {
      const columns =
        "event_id, payment_id, event_type, target_url, ok, status, attempt_count, error, completed_at";
      const limit = normalizeWebhookDeliveryLimit(input.limit);
      let result: D1ResultLike<D1WebhookDeliveryRow> | D1WebhookDeliveryRow[];

      if (input.paymentId && input.eventId) {
        result = await allD1<D1WebhookDeliveryRow>(
          database
            .prepare(
              `select ${columns} from ${tableName} where payment_id = ? and event_id = ? order by completed_at desc, id desc limit ?`,
            )
            .bind(input.paymentId, input.eventId, limit),
        );
      } else if (input.paymentId) {
        result = await allD1<D1WebhookDeliveryRow>(
          database
            .prepare(
              `select ${columns} from ${tableName} where payment_id = ? order by completed_at desc, id desc limit ?`,
            )
            .bind(input.paymentId, limit),
        );
      } else if (input.eventId) {
        result = await allD1<D1WebhookDeliveryRow>(
          database
            .prepare(
              `select ${columns} from ${tableName} where event_id = ? order by completed_at desc, id desc limit ?`,
            )
            .bind(input.eventId, limit),
        );
      } else {
        result = await allD1<D1WebhookDeliveryRow>(
          database
            .prepare(
              `select ${columns} from ${tableName} order by completed_at desc, id desc limit ?`,
            )
            .bind(limit),
        );
      }

      return d1Rows(result).map(mapD1WebhookDeliveryRecord);
    },
  };
}

export function createD1WebhookDeliveryStoreSchema(
  options: WebhookDeliveryStoreOptions = {},
): string {
  const tableName = sqlIdentifier(options.tableName ?? "zkpay_webhook_delivery");

  return [
    `create table if not exists ${tableName} (`,
    "  id integer primary key autoincrement,",
    "  event_id text not null,",
    "  payment_id text not null,",
    "  event_type text not null,",
    "  target_url text,",
    "  ok integer not null,",
    "  status integer,",
    "  attempt_count integer not null,",
    "  error text,",
    "  completed_at text not null",
    ");",
    `create index if not exists ${tableName}_payment_id_idx on ${tableName} (payment_id);`,
    `create index if not exists ${tableName}_event_id_idx on ${tableName} (event_id);`,
  ].join("\n");
}

export interface ZkpayApiOptions extends ZkpayClientOptions {
  sui?: SuiReceiptVerifierOptions;
  suiVerifier?: SuiVerifier;
  replayStore?: SuiReplayStore | false;
  requireIntentSignature?: boolean;
  webhookDispatcher?: WebhookDispatcher;
  webhookDeliveryStore?: WebhookDeliveryStore | false;
}

export interface SignedWebhookEvent {
  event: WebhookEvent;
  signatureHeader: string;
}

export interface WebhookDeliveryResult {
  ok: boolean;
  url?: string;
  status?: number;
  attemptCount: number;
  error?: string;
  completedAt: string;
}

export interface WebhookDeliveryLogResult {
  ok: boolean;
  recordCount: number;
  error?: string;
  completedAt: string;
}

export interface WebhookDispatcher {
  dispatch(
    webhook: SignedWebhookEvent,
  ): Promise<WebhookDeliveryResult[]> | WebhookDeliveryResult[];
}

export interface HttpWebhookTarget {
  url: string;
  headers?: Record<string, string>;
}

export interface WebhookRetryOptions {
  attempts?: number;
  delayMs?: number;
  backoffFactor?: number;
}

export interface HttpWebhookDispatcherOptions {
  targets: readonly HttpWebhookTarget[];
  retry?: WebhookRetryOptions;
  fetch?: typeof globalThis.fetch;
}

export function createHttpWebhookDispatcher(
  options: HttpWebhookDispatcherOptions,
): WebhookDispatcher {
  const targets = options.targets.map((target) => ({
    ...target,
    url: target.url.trim(),
  }));

  if (targets.length === 0) {
    throw new Error("At least one webhook target is required");
  }

  for (const target of targets) {
    if (!target.url) throw new Error("Webhook target URL is required");
  }

  const fetchFn = options.fetch ?? globalThis.fetch;

  if (!fetchFn) {
    throw new Error("fetch is required for HTTP webhook delivery");
  }

  return {
    async dispatch(webhook) {
      return Promise.all(
        targets.map((target) =>
          deliverHttpWebhook(webhook, target, fetchFn, options.retry),
        ),
      );
    },
  };
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

  app.get("/webhooks/deliveries", async (context) => {
    const store = options.webhookDeliveryStore;

    if (!store || !store.list) {
      return context.json(
        {
          error: "webhook_delivery_store_unavailable",
        },
        501,
      );
    }

    const query = webhookDeliveryListQuerySchema.safeParse(context.req.query());

    if (!query.success) {
      return context.json(
        {
          error: "invalid_webhook_delivery_query",
          details: query.error.issues,
        },
        400,
      );
    }

    try {
      return context.json({
        deliveries: await store.list(query.data),
      });
    } catch (error) {
      return context.json(
        {
          error: "webhook_delivery_query_failed",
          details: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

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
    const webhookResponse = result.ok
      ? await createWebhookResponse(
          client,
          options,
          payload.data.intent,
          payload.data.receipt,
          "payments.verify",
        )
      : {};

    return context.json(
      { ...result, ...webhookResponse },
      result.ok ? 200 : 422,
    );
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

      const webhookResponse = await createWebhookResponse(
        client,
        options,
        payload.data.intent,
        result.receipt,
        "payments.verify.sui",
      );
      const responseBody = {
        ...result,
        replay,
        ...webhookResponse,
      };

      return context.json(
        responseBody,
        200,
      );
    }

    const webhookResponse =
      result.ok && result.receipt
        ? await createWebhookResponse(
            client,
            options,
            payload.data.intent,
            result.receipt,
            "payments.verify.sui",
          )
        : {};

    return context.json(
      { ...result, ...webhookResponse },
      result.ok ? 200 : 422,
    );
  });

  return app;
}

async function deliverHttpWebhook(
  webhook: SignedWebhookEvent,
  target: HttpWebhookTarget,
  fetchFn: typeof globalThis.fetch,
  retry: WebhookRetryOptions = {},
): Promise<WebhookDeliveryResult> {
  const attempts = Math.max(1, retry.attempts ?? 3);
  const delayMs = Math.max(0, retry.delayMs ?? 250);
  const backoffFactor = Math.max(1, retry.backoffFactor ?? 2);
  let status: number | undefined;
  let error: string | undefined;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchFn(target.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "zkpay-signature": webhook.signatureHeader,
          ...target.headers,
        },
        body: JSON.stringify(webhook.event),
      });

      status = response.status;

      if (response.ok) {
        return {
          ok: true,
          url: target.url,
          status,
          attemptCount: attempt,
          completedAt: new Date().toISOString(),
        };
      }

      error = `HTTP ${response.status}`;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }

    if (attempt < attempts && delayMs > 0) {
      await sleep(delayMs * Math.pow(backoffFactor, attempt - 1));
    }
  }

  return {
    ok: false,
    url: target.url,
    status,
    attemptCount: attempts,
    error,
    completedAt: new Date().toISOString(),
  };
}

async function createWebhookResponse(
  client: ZkpayClient,
  options: ZkpayApiOptions,
  intent: PaymentIntent,
  receipt: PaymentReceipt,
  source: string,
): Promise<
  | {
      webhook: SignedWebhookEvent;
      webhookDelivery?: WebhookDeliveryResult[];
      webhookDeliveryLog?: WebhookDeliveryLogResult;
    }
  | Record<string, never>
> {
  const webhook = createSignedWebhookEvent(
    client,
    options,
    intent,
    receipt,
    source,
  );

  if (!webhook) return {};

  if (!options.webhookDispatcher) return { webhook };

  let webhookDelivery: WebhookDeliveryResult[];

  try {
    webhookDelivery = await options.webhookDispatcher.dispatch(webhook);
  } catch (error) {
    webhookDelivery = [
      {
        ok: false,
        attemptCount: 0,
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date().toISOString(),
      },
    ];
  }

  const webhookDeliveryLog = await recordWebhookDeliveries(
    options,
    webhook,
    webhookDelivery,
  );

  return {
    webhook,
    webhookDelivery,
    ...(webhookDeliveryLog ? { webhookDeliveryLog } : {}),
  };
}

function createSignedWebhookEvent(
  client: ZkpayClient,
  options: ZkpayApiOptions,
  intent: PaymentIntent,
  receipt: PaymentReceipt,
  source: string,
): SignedWebhookEvent | undefined {
  const secret = options.webhookSecret?.trim();

  if (!secret) return undefined;

  const event = client.createWebhookEvent({
    type: "payment.succeeded",
    paymentId: intent.id,
    intent,
    receipt,
    data: {
      source,
    },
  });

  return {
    event,
    signatureHeader: client.signWebhookEvent(event, secret),
  };
}

async function recordWebhookDeliveries(
  options: ZkpayApiOptions,
  webhook: SignedWebhookEvent,
  results: readonly WebhookDeliveryResult[],
): Promise<WebhookDeliveryLogResult | undefined> {
  if (!options.webhookDeliveryStore || results.length === 0) return undefined;

  try {
    for (const result of results) {
      await options.webhookDeliveryStore.record(
        createWebhookDeliveryRecord(webhook, result),
      );
    }

    return {
      ok: true,
      recordCount: results.length,
      completedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      recordCount: 0,
      error: error instanceof Error ? error.message : String(error),
      completedAt: new Date().toISOString(),
    };
  }
}

function createWebhookDeliveryRecord(
  webhook: SignedWebhookEvent,
  result: WebhookDeliveryResult,
): WebhookDeliveryRecord {
  return {
    eventId: webhook.event.id,
    paymentId: webhook.event.paymentId,
    eventType: webhook.event.type,
    targetUrl: result.url,
    ok: result.ok,
    status: result.status,
    attemptCount: result.attemptCount,
    error: result.error,
    completedAt: result.completedAt,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

interface D1WebhookDeliveryRow {
  event_id: string;
  payment_id: string;
  event_type: string;
  target_url?: string | null;
  ok: boolean | number;
  status?: number | null;
  attempt_count: number;
  error?: string | null;
  completed_at: string;
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

function mapD1WebhookDeliveryRecord(
  row: D1WebhookDeliveryRow,
): WebhookDeliveryRecord {
  return {
    eventId: row.event_id,
    paymentId: row.payment_id,
    eventType: row.event_type,
    targetUrl: row.target_url === null ? undefined : row.target_url,
    ok: Number(row.ok) === 1,
    status: row.status === null ? undefined : row.status,
    attemptCount: row.attempt_count,
    error: row.error === null ? undefined : row.error,
    completedAt: row.completed_at,
  };
}

function d1Rows<T>(result: D1ResultLike<T> | T[]): T[] {
  return Array.isArray(result) ? result : result.results;
}

async function allD1<T>(
  statement: D1PreparedStatementLike,
): Promise<D1ResultLike<T> | T[]> {
  if (!statement.all) {
    throw new Error("D1 all() is required for webhook delivery listing");
  }

  return statement.all<T>();
}

function normalizeWebhookDeliveryLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return 50;

  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

function sqlIdentifier(value: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }

  return value;
}
