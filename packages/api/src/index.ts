import { Hono } from "hono";
import { z } from "zod";
import {
  SuiReceiptVerifier,
  ZkpayClient,
  paymentIntentInputSchema,
  paymentIntentSchema,
  paymentReceiptSchema,
  signWebhookEvent,
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

const webhookEventTypeSchema = z.enum([
  "payment.succeeded",
  "payment.failed",
  "payment.updated",
]);

const webhookEndpointIdSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_-]+$/, "Expected a URL-safe webhook endpoint id");

const webhookEndpointHeadersSchema = z
  .record(z.string().min(1).max(128), z.string().max(1024))
  .optional();

const webhookEndpointEventTypesSchema = z
  .array(webhookEventTypeSchema)
  .min(1)
  .max(8)
  .optional();

const webhookEndpointCreateSchema = z.object({
  id: webhookEndpointIdSchema.optional(),
  merchantId: z.string().min(1).max(120).optional(),
  url: z.string().url().max(2048),
  headers: webhookEndpointHeadersSchema,
  eventTypes: webhookEndpointEventTypesSchema,
  signingSecret: z.string().min(1).max(4096).optional(),
  enabled: z.boolean().optional(),
});

const webhookEndpointPatchSchema = z
  .object({
    merchantId: z.string().min(1).max(120).nullable().optional(),
    url: z.string().url().max(2048).optional(),
    headers: z
      .record(z.string().min(1).max(128), z.string().max(1024))
      .nullable()
      .optional(),
    eventTypes: z
      .array(webhookEventTypeSchema)
      .min(1)
      .max(8)
      .nullable()
      .optional(),
    signingSecret: z.string().min(1).max(4096).nullable().optional(),
    enabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one endpoint field is required",
  });

const optionalBooleanQuerySchema = z
  .union([
    z.boolean(),
    z.enum(["true", "false"]).transform((value) => value === "true"),
  ])
  .optional();

const webhookEndpointListQuerySchema = z.object({
  merchantId: z.string().min(1).max(120).optional(),
  enabled: optionalBooleanQuerySchema,
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const webhookEndpointTestSchema = z
  .object({
    paymentId: z
      .string()
      .regex(/^zkp_[a-zA-Z0-9_-]+$/, "Expected a zkpay payment id")
      .optional(),
    eventType: webhookEventTypeSchema.optional(),
    data: z.record(z.unknown()).optional(),
  })
  .default({});

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

export interface WebhookEndpointRegistryOptions {
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

export interface WebhookEndpoint extends HttpWebhookTarget {
  id: string;
  merchantId?: string;
  eventTypes?: readonly WebhookEvent["type"][];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicWebhookEndpoint extends Omit<WebhookEndpoint, "signingSecret"> {
  hasSigningSecret: boolean;
}

export interface WebhookEndpointRegistry {
  listTargets(
    webhook: SignedWebhookEvent,
  ): Promise<readonly HttpWebhookTarget[]> | readonly HttpWebhookTarget[];
}

export interface WebhookEndpointCreateInput {
  id?: string;
  merchantId?: string;
  url: string;
  headers?: Record<string, string>;
  eventTypes?: readonly WebhookEvent["type"][];
  signingSecret?: string;
  enabled?: boolean;
  now?: Date | string;
}

export interface WebhookEndpointPatchInput {
  merchantId?: string | null;
  url?: string;
  headers?: Record<string, string> | null;
  eventTypes?: readonly WebhookEvent["type"][] | null;
  signingSecret?: string | null;
  enabled?: boolean;
  now?: Date | string;
}

export interface WebhookEndpointListInput {
  merchantId?: string;
  enabled?: boolean;
  limit?: number;
}

export interface WebhookEndpointStore extends WebhookEndpointRegistry {
  create(
    input: WebhookEndpointCreateInput,
  ): Promise<WebhookEndpoint> | WebhookEndpoint;
  get(id: string): Promise<WebhookEndpoint | null> | WebhookEndpoint | null;
  list(
    input?: WebhookEndpointListInput,
  ): Promise<WebhookEndpoint[]> | WebhookEndpoint[];
  patch(
    id: string,
    input: WebhookEndpointPatchInput,
  ): Promise<WebhookEndpoint | null> | WebhookEndpoint | null;
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

export class InMemoryWebhookEndpointRegistry implements WebhookEndpointStore {
  readonly endpoints: WebhookEndpoint[] = [];

  constructor(endpoints: readonly WebhookEndpointCreateInput[] = []) {
    this.endpoints.push(
      ...endpoints.map((endpoint) => createWebhookEndpoint(endpoint)),
    );
  }

  add(endpoint: WebhookEndpointCreateInput): void {
    this.endpoints.push(createWebhookEndpoint(endpoint));
  }

  create(input: WebhookEndpointCreateInput): WebhookEndpoint {
    const endpoint = createWebhookEndpoint(input);

    this.endpoints.push(endpoint);

    return endpoint;
  }

  get(id: string): WebhookEndpoint | null {
    return this.endpoints.find((endpoint) => endpoint.id === id) ?? null;
  }

  list(input: WebhookEndpointListInput = {}): WebhookEndpoint[] {
    const limit = normalizeWebhookEndpointLimit(input.limit);

    return this.endpoints
      .filter((endpoint) =>
        input.merchantId ? endpoint.merchantId === input.merchantId : true,
      )
      .filter((endpoint) =>
        input.enabled === undefined ? true : endpoint.enabled === input.enabled,
      )
      .sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        right.id.localeCompare(left.id),
      )
      .slice(0, limit);
  }

  patch(id: string, input: WebhookEndpointPatchInput): WebhookEndpoint | null {
    const index = this.endpoints.findIndex((endpoint) => endpoint.id === id);

    if (index < 0) return null;

    const endpoint = patchWebhookEndpoint(this.endpoints[index], input);
    this.endpoints[index] = endpoint;

    return endpoint;
  }

  listTargets(webhook: SignedWebhookEvent): readonly HttpWebhookTarget[] {
    return this.endpoints
      .filter((endpoint) => matchesWebhookEndpoint(endpoint, webhook))
      .map((endpoint) => ({
        url: endpoint.url,
        headers: endpoint.headers,
        signingSecret: endpoint.signingSecret,
      }));
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

export function createD1WebhookEndpointRegistry(
  database: D1DatabaseLike,
  options: WebhookEndpointRegistryOptions = {},
): WebhookEndpointStore {
  const tableName = sqlIdentifier(options.tableName ?? "zkpay_webhook_endpoints");

  return {
    async create(input) {
      const endpoint = createWebhookEndpoint(input);

      await database
        .prepare(
          `insert into ${tableName} (id, merchant_id, url, headers_json, event_types_json, signing_secret, enabled, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          endpoint.id,
          endpoint.merchantId ?? null,
          endpoint.url,
          serializeOptionalJson(endpoint.headers),
          serializeOptionalJson(endpoint.eventTypes),
          endpoint.signingSecret ?? null,
          endpoint.enabled ? 1 : 0,
          endpoint.createdAt,
          endpoint.updatedAt,
        )
        .run();

      return endpoint;
    },
    async get(id) {
      return findD1WebhookEndpoint(database, tableName, id);
    },
    async list(input = {}) {
      const columns =
        "id, merchant_id, url, headers_json, event_types_json, signing_secret, enabled, created_at, updated_at";
      const limit = normalizeWebhookEndpointLimit(input.limit);
      let result: D1ResultLike<D1WebhookEndpointRow> | D1WebhookEndpointRow[];

      if (input.merchantId && input.enabled !== undefined) {
        result = await allD1<D1WebhookEndpointRow>(
          database
            .prepare(
              `select ${columns} from ${tableName} where merchant_id = ? and enabled = ? order by created_at desc, id desc limit ?`,
            )
            .bind(input.merchantId, input.enabled ? 1 : 0, limit),
        );
      } else if (input.merchantId) {
        result = await allD1<D1WebhookEndpointRow>(
          database
            .prepare(
              `select ${columns} from ${tableName} where merchant_id = ? order by created_at desc, id desc limit ?`,
            )
            .bind(input.merchantId, limit),
        );
      } else if (input.enabled !== undefined) {
        result = await allD1<D1WebhookEndpointRow>(
          database
            .prepare(
              `select ${columns} from ${tableName} where enabled = ? order by created_at desc, id desc limit ?`,
            )
            .bind(input.enabled ? 1 : 0, limit),
        );
      } else {
        result = await allD1<D1WebhookEndpointRow>(
          database
            .prepare(
              `select ${columns} from ${tableName} order by created_at desc, id desc limit ?`,
            )
            .bind(limit),
        );
      }

      return d1Rows(result).map(mapD1WebhookEndpoint);
    },
    async patch(id, input) {
      const existing = await findD1WebhookEndpoint(database, tableName, id);

      if (!existing) return null;

      const endpoint = patchWebhookEndpoint(existing, input);

      await database
        .prepare(
          `update ${tableName} set merchant_id = ?, url = ?, headers_json = ?, event_types_json = ?, signing_secret = ?, enabled = ?, updated_at = ? where id = ?`,
        )
        .bind(
          endpoint.merchantId ?? null,
          endpoint.url,
          serializeOptionalJson(endpoint.headers),
          serializeOptionalJson(endpoint.eventTypes),
          endpoint.signingSecret ?? null,
          endpoint.enabled ? 1 : 0,
          endpoint.updatedAt,
          endpoint.id,
        )
        .run();

      return endpoint;
    },
    async listTargets(webhook) {
      const merchantId = webhook.event.intent?.metadata.merchantId;
      const columns =
        "id, merchant_id, url, headers_json, event_types_json, signing_secret, enabled, created_at, updated_at";
      const result = merchantId
        ? await allD1<D1WebhookEndpointRow>(
            database
              .prepare(
                `select ${columns} from ${tableName} where enabled = 1 and (merchant_id is null or merchant_id = ?) order by created_at asc, id asc`,
              )
              .bind(merchantId),
          )
        : await allD1<D1WebhookEndpointRow>(
            database
              .prepare(
                `select ${columns} from ${tableName} where enabled = 1 and merchant_id is null order by created_at asc, id asc`,
              ),
          );

      return d1Rows(result)
        .map(mapD1WebhookEndpoint)
        .filter((endpoint) => matchesWebhookEndpoint(endpoint, webhook))
        .map((endpoint) => ({
          url: endpoint.url,
          headers: endpoint.headers,
          signingSecret: endpoint.signingSecret,
        }));
    },
  };
}

export function createD1WebhookEndpointRegistrySchema(
  options: WebhookEndpointRegistryOptions = {},
): string {
  const tableName = sqlIdentifier(options.tableName ?? "zkpay_webhook_endpoints");

  return [
    `create table if not exists ${tableName} (`,
    "  id text primary key,",
    "  merchant_id text,",
    "  url text not null,",
    "  headers_json text,",
    "  event_types_json text,",
    "  signing_secret text,",
    "  enabled integer not null default 1,",
    "  created_at text not null,",
    "  updated_at text not null",
    ");",
    `create index if not exists ${tableName}_merchant_id_idx on ${tableName} (merchant_id);`,
    `create index if not exists ${tableName}_enabled_idx on ${tableName} (enabled);`,
  ].join("\n");
}

export interface ZkpayApiOptions extends ZkpayClientOptions {
  sui?: SuiReceiptVerifierOptions;
  suiVerifier?: SuiVerifier;
  replayStore?: SuiReplayStore | false;
  requireIntentSignature?: boolean;
  webhookDispatcher?: WebhookDispatcher;
  webhookDeliveryStore?: WebhookDeliveryStore | false;
  webhookEndpointStore?: WebhookEndpointStore | false;
  webhookTestFetch?: typeof globalThis.fetch;
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
  signingSecret?: string;
}

export interface WebhookRetryOptions {
  attempts?: number;
  delayMs?: number;
  backoffFactor?: number;
}

export interface HttpWebhookDispatcherOptions {
  targets?: readonly HttpWebhookTarget[];
  endpointRegistry?: WebhookEndpointRegistry;
  retry?: WebhookRetryOptions;
  fetch?: typeof globalThis.fetch;
}

export function createHttpWebhookDispatcher(
  options: HttpWebhookDispatcherOptions,
): WebhookDispatcher {
  const targets = (options.targets ?? []).map(normalizeWebhookTarget);

  if (targets.length === 0 && !options.endpointRegistry) {
    throw new Error("At least one webhook target or endpoint registry is required");
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
      const registryTargets = options.endpointRegistry
        ? (await options.endpointRegistry.listTargets(webhook)).map(
            normalizeWebhookTarget,
          )
        : [];
      const deliveryTargets = [...targets, ...registryTargets];

      for (const target of deliveryTargets) {
        if (!target.url) throw new Error("Webhook target URL is required");
      }

      return Promise.all(
        deliveryTargets.map((target) =>
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

  app.get("/webhooks/endpoints", async (context) => {
    const store = options.webhookEndpointStore;

    if (!store) {
      return context.json(
        {
          error: "webhook_endpoint_store_unavailable",
        },
        501,
      );
    }

    const query = webhookEndpointListQuerySchema.safeParse(context.req.query());

    if (!query.success) {
      return context.json(
        {
          error: "invalid_webhook_endpoint_query",
          details: query.error.issues,
        },
        400,
      );
    }

    try {
      return context.json({
        endpoints: (await store.list(query.data)).map(publicWebhookEndpoint),
      });
    } catch (error) {
      return context.json(
        {
          error: "webhook_endpoint_query_failed",
          details: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.post("/webhooks/endpoints", async (context) => {
    const store = options.webhookEndpointStore;

    if (!store) {
      return context.json(
        {
          error: "webhook_endpoint_store_unavailable",
        },
        501,
      );
    }

    const payload = webhookEndpointCreateSchema.safeParse(
      await context.req.json(),
    );

    if (!payload.success) {
      return context.json(
        {
          error: "invalid_webhook_endpoint_request",
          details: payload.error.issues,
        },
        400,
      );
    }

    try {
      const endpoint = await store.create(payload.data);

      return context.json(
        {
          endpoint: publicWebhookEndpoint(endpoint),
        },
        201,
      );
    } catch (error) {
      return context.json(
        {
          error: "webhook_endpoint_create_failed",
          details: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.patch("/webhooks/endpoints/:id", async (context) => {
    const store = options.webhookEndpointStore;

    if (!store) {
      return context.json(
        {
          error: "webhook_endpoint_store_unavailable",
        },
        501,
      );
    }

    const id = webhookEndpointIdSchema.safeParse(context.req.param("id"));

    if (!id.success) {
      return context.json(
        {
          error: "invalid_webhook_endpoint_id",
          details: id.error.issues,
        },
        400,
      );
    }

    const payload = webhookEndpointPatchSchema.safeParse(
      await context.req.json(),
    );

    if (!payload.success) {
      return context.json(
        {
          error: "invalid_webhook_endpoint_patch",
          details: payload.error.issues,
        },
        400,
      );
    }

    try {
      const endpoint = await store.patch(id.data, payload.data);

      if (!endpoint) {
        return context.json(
          {
            error: "webhook_endpoint_not_found",
          },
          404,
        );
      }

      return context.json({
        endpoint: publicWebhookEndpoint(endpoint),
      });
    } catch (error) {
      return context.json(
        {
          error: "webhook_endpoint_patch_failed",
          details: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.post("/webhooks/endpoints/:id/test", async (context) => {
    const store = options.webhookEndpointStore;

    if (!store) {
      return context.json(
        {
          error: "webhook_endpoint_store_unavailable",
        },
        501,
      );
    }

    const id = webhookEndpointIdSchema.safeParse(context.req.param("id"));

    if (!id.success) {
      return context.json(
        {
          error: "invalid_webhook_endpoint_id",
          details: id.error.issues,
        },
        400,
      );
    }

    const payload = webhookEndpointTestSchema.safeParse(
      await readOptionalJson(context),
    );

    if (!payload.success) {
      return context.json(
        {
          error: "invalid_webhook_endpoint_test_request",
          details: payload.error.issues,
        },
        400,
      );
    }

    const endpoint = await store.get(id.data);

    if (!endpoint) {
      return context.json(
        {
          error: "webhook_endpoint_not_found",
        },
        404,
      );
    }

    const signingSecret = endpoint.signingSecret ?? options.webhookSecret;

    if (!signingSecret) {
      return context.json(
        {
          error: "webhook_endpoint_signing_secret_missing",
        },
        400,
      );
    }

    const fetchFn = options.webhookTestFetch ?? globalThis.fetch;

    if (!fetchFn) {
      return context.json(
        {
          error: "webhook_endpoint_test_fetch_unavailable",
        },
        502,
      );
    }

    const event = client.createWebhookEvent({
      type: payload.data.eventType ?? "payment.updated",
      paymentId: payload.data.paymentId ?? "zkp_webhook_test",
      data: {
        source: "webhooks.endpoints.test",
        endpointId: endpoint.id,
        ...(payload.data.data ?? {}),
      },
    });
    const webhook = {
      event,
      signatureHeader: client.signWebhookEvent(event, signingSecret),
    };
    const delivery = await deliverHttpWebhook(
      webhook,
      endpoint,
      fetchFn,
      {
        attempts: 1,
      },
    );

    return context.json({
      endpoint: publicWebhookEndpoint(endpoint),
      delivery,
    });
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

async function readOptionalJson(context: {
  req: { json(): Promise<unknown> };
}): Promise<unknown> {
  try {
    return await context.req.json();
  } catch {
    return {};
  }
}

function publicWebhookEndpoint(
  endpoint: WebhookEndpoint,
): PublicWebhookEndpoint {
  const { signingSecret: _signingSecret, ...publicEndpoint } = endpoint;

  return {
    ...publicEndpoint,
    headers: redactWebhookEndpointHeaders(endpoint.headers),
    hasSigningSecret: Boolean(endpoint.signingSecret),
  };
}

function redactWebhookEndpointHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!headers) return undefined;

  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      isSensitiveWebhookHeader(key) ? "[redacted]" : value,
    ]),
  );
}

function isSensitiveWebhookHeader(key: string): boolean {
  return /authorization|token|secret|api[-_]?key/i.test(key);
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
          ...target.headers,
          "zkpay-signature": signWebhookForTarget(webhook, target),
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

function signWebhookForTarget(
  webhook: SignedWebhookEvent,
  target: HttpWebhookTarget,
): string {
  return target.signingSecret
    ? signWebhookEvent(webhook.event, target.signingSecret)
    : webhook.signatureHeader;
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

async function findD1WebhookEndpoint(
  database: D1DatabaseLike,
  tableName: string,
  id: string,
): Promise<WebhookEndpoint | null> {
  const row = await database
    .prepare(
      `select id, merchant_id, url, headers_json, event_types_json, signing_secret, enabled, created_at, updated_at from ${tableName} where id = ? limit 1`,
    )
    .bind(id)
    .first<D1WebhookEndpointRow>();

  return row ? mapD1WebhookEndpoint(row) : null;
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

interface D1WebhookEndpointRow {
  id: string;
  merchant_id?: string | null;
  url: string;
  headers_json?: string | null;
  event_types_json?: string | null;
  signing_secret?: string | null;
  enabled: boolean | number;
  created_at: string;
  updated_at: string;
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

function createWebhookEndpoint(
  input: WebhookEndpointCreateInput,
): WebhookEndpoint {
  const timestamp = toTimestamp(input.now);

  return normalizeWebhookEndpoint({
    id: input.id ?? createWebhookEndpointId(),
    merchantId: input.merchantId,
    url: input.url,
    headers: input.headers,
    eventTypes: input.eventTypes,
    signingSecret: input.signingSecret,
    enabled: input.enabled ?? true,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

function patchWebhookEndpoint(
  endpoint: WebhookEndpoint,
  input: WebhookEndpointPatchInput,
): WebhookEndpoint {
  return normalizeWebhookEndpoint({
    ...endpoint,
    merchantId:
      input.merchantId === undefined
        ? endpoint.merchantId
        : input.merchantId ?? undefined,
    url: input.url ?? endpoint.url,
    headers:
      input.headers === undefined
        ? endpoint.headers
        : input.headers ?? undefined,
    eventTypes:
      input.eventTypes === undefined
        ? endpoint.eventTypes
        : input.eventTypes ?? undefined,
    signingSecret:
      input.signingSecret === undefined
        ? endpoint.signingSecret
        : input.signingSecret?.trim() || undefined,
    enabled: input.enabled ?? endpoint.enabled,
    updatedAt: toTimestamp(input.now),
  });
}

function normalizeWebhookEndpoint(endpoint: WebhookEndpoint): WebhookEndpoint {
  return {
    id: endpoint.id,
    merchantId: endpoint.merchantId,
    url: endpoint.url.trim(),
    headers: endpoint.headers,
    eventTypes: endpoint.eventTypes
      ? [...new Set(endpoint.eventTypes)]
      : undefined,
    signingSecret: endpoint.signingSecret?.trim() || undefined,
    enabled: endpoint.enabled,
    createdAt: endpoint.createdAt,
    updatedAt: endpoint.updatedAt,
  };
}

function mapD1WebhookEndpoint(row: D1WebhookEndpointRow): WebhookEndpoint {
  return {
    id: row.id,
    merchantId: row.merchant_id === null ? undefined : row.merchant_id,
    url: row.url,
    headers: parseD1StringRecord(row.headers_json, "headers_json"),
    eventTypes: parseD1WebhookEventTypes(row.event_types_json),
    signingSecret:
      row.signing_secret === null ? undefined : row.signing_secret,
    enabled: Number(row.enabled) === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createWebhookEndpointId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();

  if (uuid) return `zwe_${uuid.replaceAll("-", "").slice(0, 24)}`;

  return `zwe_${Math.random().toString(36).slice(2, 14)}`;
}

function matchesWebhookEndpoint(
  endpoint: WebhookEndpoint,
  webhook: SignedWebhookEvent,
): boolean {
  if (endpoint.enabled === false) return false;
  if (!endpoint.url.trim()) return false;

  const merchantId = webhook.event.intent?.metadata.merchantId;

  if (endpoint.merchantId && endpoint.merchantId !== merchantId) {
    return false;
  }

  if (endpoint.eventTypes && endpoint.eventTypes.length > 0) {
    return endpoint.eventTypes.includes(webhook.event.type);
  }

  return true;
}

function normalizeWebhookTarget(target: HttpWebhookTarget): HttpWebhookTarget {
  return {
    ...target,
    url: target.url.trim(),
    signingSecret: target.signingSecret?.trim() || undefined,
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

function parseD1StringRecord(
  value: string | null | undefined,
  fieldName: string,
): Record<string, string> | undefined {
  if (!value) return undefined;

  const parsed = JSON.parse(value);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    !Object.values(parsed).every((item) => typeof item === "string")
  ) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return parsed as Record<string, string>;
}

function parseD1WebhookEventTypes(
  value: string | null | undefined,
): WebhookEvent["type"][] | undefined {
  if (!value) return undefined;

  const parsed = JSON.parse(value);

  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (item) =>
        item === "payment.succeeded" ||
        item === "payment.failed" ||
        item === "payment.updated",
    )
  ) {
    throw new Error("Invalid event_types_json");
  }

  return parsed;
}

function serializeOptionalJson(value: unknown): string | null {
  return value === undefined ? null : JSON.stringify(value);
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

function normalizeWebhookEndpointLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return 50;

  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

function toTimestamp(value: Date | string | undefined): string {
  return value instanceof Date
    ? value.toISOString()
    : value ?? new Date().toISOString();
}

function sqlIdentifier(value: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }

  return value;
}
