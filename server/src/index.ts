import { Sentry } from "./instrument.js";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, {
  type FastifyInstance,
  type FastifyListenOptions,
  type FastifyServerOptions,
} from "fastify";
import { pathToFileURL } from "node:url";
import { requireAuth } from "./auth.js";
import { adaptyWebhookRoutes } from "./routes/adaptyWebhook.js";
import { config } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { supportRoutes } from "./routes/support.js";
import { userRoutes } from "./routes/user.js";
import {
  vendorPublicRoutes,
  vendorRoutes,
} from "./routes/vendors.js";
import { vendorWebhookRoutes } from "./routes/vendorWebhooks.js";
import {
  createDeletionRetryWorker,
  type DeletionRetryWorker,
} from "./userDeletion/index.js";

declare module "fastify" {
  interface FastifyInstance {
    deletionRetryWorker?: DeletionRetryWorker;
  }
}

export interface BuildServerOptions extends FastifyServerOptions {
  deletionRetryWorker?: DeletionRetryWorker | null;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const app = Fastify({
    trustProxy: true,
    ...options,
  });
  void app.register(helmet, {
    contentSecurityPolicy: false,
    frameguard: { action: "deny" },
  });
  void app.register(rateLimit, {
    global: true,
    max: config.nodeEnv === "test" ? Number.MAX_SAFE_INTEGER : 100,
    timeWindow: "1 minute",
  });
  void app.register(healthRoutes, { prefix: "/v1" });
  void app.register(adaptyWebhookRoutes, { prefix: "/v1" });
  void app.register(vendorPublicRoutes, { prefix: "/v1" });
  void app.register(vendorWebhookRoutes, { prefix: "/v1" });
  void app.register(
    async (protectedScope) => {
      protectedScope.addHook("onRequest", requireAuth);
      await protectedScope.register(supportRoutes);
      await protectedScope.register(userRoutes);
      await protectedScope.register(vendorRoutes);
    },
    { prefix: "/v1" },
  );

  // Bounded durable retry worker for provider-last checkpoint gaps. It
  // completes deletions without a client token (e.g. lost response after
  // auth erasure). Single-flight local; concurrent replicas are safe via
  // idempotent gateway operations and serialized checkpoint transactions.
  // Disabled in tests and when deletion is unconfigured.
  const workerOption = options.deletionRetryWorker;
  if (workerOption !== null && config.nodeEnv !== "test") {
    const worker =
      workerOption ??
      (config.deletionWorkerEnabled
        ? createDeletionRetryWorker({ environment: config })
        : undefined);
    if (worker) {
      app.decorate("deletionRetryWorker", worker);
      app.addHook("onReady", async () => {
        worker.start();
      });
      app.addHook("onClose", async () => {
        worker.stop();
      });
    }
  }

  return app;
}

export async function listenServer(
  app: FastifyInstance = buildServer(),
  options: FastifyListenOptions = { host: config.host, port: config.port },
): Promise<FastifyInstance> {
  await app.listen(options);
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  listenServer().catch((error: unknown) => {
    Sentry.captureException(error);
    console.error("Fatal startup error:", error);
    process.exitCode = 1;
  });
}
