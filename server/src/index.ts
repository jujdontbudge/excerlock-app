import { Sentry } from "./instrument.js";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, {
  type FastifyInstance,
  type FastifyListenOptions,
  type FastifyServerOptions,
} from "fastify";
import { pathToFileURL } from "node:url";
import { requireAuth } from "./packages/auth/auth.js";
import { accessRoutes } from "./routes/access.js";
import { adaptyWebhookRoutes } from "./routes/adaptyWebhook.js";
import { config } from "./packages/config/config.js";
import { healthRoutes } from "./routes/health.js";
import { incidentReportRoutes } from "./routes/incidentReports.js";
import { supportRoutes } from "./routes/support.js";
import { userRoutes } from "./routes/user.js";
import { subscriptionRoutes } from "./routes/subscription.js";
import {
  vendorPublicRoutes,
  vendorRoutes,
} from "./routes/vendors.js";
import { vendorWebhookRoutes } from "./routes/vendorWebhooks.js";
import {
  createDeletionRetryWorker,
  type DeletionRetryWorker,
} from "./packages/user-deletion/index.js";

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
    ...options,
    trustProxy: ["127.0.0.1", "::1"],
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
  app.setErrorHandler((error, _request, reply) => {
    const errorStatusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : undefined;
    const statusCode =
      typeof errorStatusCode === "number" &&
      Number.isInteger(errorStatusCode) &&
      errorStatusCode >= 400 &&
      errorStatusCode < 500
        ? errorStatusCode
        : 500;
    const code =
      statusCode === 429
        ? "RATE_LIMITED"
        : statusCode >= 500
          ? "INTERNAL_SERVER_ERROR"
          : "INVALID_REQUEST";
    const message =
      statusCode === 429
        ? "Too many requests"
        : statusCode >= 500
          ? "Internal server error"
          : "Invalid request";
    return reply.code(statusCode).send({ error: { code, message } });
  });
  void app.register(healthRoutes, { prefix: "/v1" });
  void app.register(adaptyWebhookRoutes, { prefix: "/v1" });
  void app.register(accessRoutes, { prefix: "/v1" });
  void app.register(vendorPublicRoutes, { prefix: "/v1" });
  void app.register(vendorWebhookRoutes, { prefix: "/v1" });
  void app.register(
    async (protectedScope) => {
      protectedScope.addHook("onRequest", requireAuth);
      await protectedScope.register(supportRoutes);
      await protectedScope.register(incidentReportRoutes);
      await protectedScope.register(userRoutes);
      await protectedScope.register(subscriptionRoutes);
      await protectedScope.register(vendorRoutes);
    },
    { prefix: "/v1" },
  );

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
