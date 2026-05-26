import {
  createD1SuiReplayStore,
  createZkpayApi,
  type D1DatabaseLike,
} from "zkpay-sh/api";

type WorkerExecutionContext = Parameters<
  ReturnType<typeof createZkpayApi>["fetch"]
>[2];

interface Env {
  ZKPAY_REPLAY: D1DatabaseLike;
  ZKPAY_BASE_URL?: string;
}

export default {
  fetch(request: Request, env: Env, context: WorkerExecutionContext) {
    const app = createZkpayApi({
      baseUrl: env.ZKPAY_BASE_URL ?? "https://zkpay.sh",
      replayStore: createD1SuiReplayStore(env.ZKPAY_REPLAY),
    });

    return app.fetch(request, env, context);
  },
};
