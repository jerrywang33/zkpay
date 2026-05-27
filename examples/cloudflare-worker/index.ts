import {
  createD1WebhookDeliveryStore,
  createD1SuiReplayStore,
  createHttpWebhookDispatcher,
  createZkpayApi,
  type D1DatabaseLike,
} from "zkpay-sh/api";

type WorkerExecutionContext = Parameters<
  ReturnType<typeof createZkpayApi>["fetch"]
>[2];

interface Env {
  ZKPAY_REPLAY: D1DatabaseLike;
  ZKPAY_BASE_URL?: string;
  ZKPAY_WEBHOOK_SECRET?: string;
  ZKPAY_WEBHOOK_URL?: string;
}

export default {
  fetch(request: Request, env: Env, context: WorkerExecutionContext) {
    const webhookDispatcher = env.ZKPAY_WEBHOOK_URL
      ? createHttpWebhookDispatcher({
          targets: [
            {
              url: env.ZKPAY_WEBHOOK_URL,
            },
          ],
        })
      : undefined;

    const app = createZkpayApi({
      baseUrl: env.ZKPAY_BASE_URL ?? "https://zkpay.sh",
      replayStore: createD1SuiReplayStore(env.ZKPAY_REPLAY),
      webhookSecret: env.ZKPAY_WEBHOOK_SECRET,
      webhookDispatcher,
      webhookDeliveryStore: webhookDispatcher
        ? createD1WebhookDeliveryStore(env.ZKPAY_REPLAY)
        : undefined,
    });

    return app.fetch(request, env, context);
  },
};
