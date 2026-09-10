import type { FastifyPluginAsync } from "fastify";
import { config } from "../config.js";
import { getDb } from "../db/index.js";
import { checkSchemaReady, type ReadinessResult } from "../db/readiness.js";
import type { Environment } from "../env.js";
import { isUserDeletionConfigured } from "../userDeletion/configuration.js";

export interface HealthResponse {
  ok: true;
  version: string;
  uptime: number;
}

export type ServiceReadinessResult =
  | ReadinessResult
  | { ready: false; reason: "configuration-missing" };
export type ReadyResponse = ServiceReadinessResult & { version: string };

interface HealthRouteDependencies {
  checkSchema?: () => Promise<ReadinessResult>;
  environment?: Environment;
}

export async function checkServiceReady(
  environment: Environment,
  checkSchema: () => Promise<ReadinessResult>,
): Promise<ServiceReadinessResult> {
  const schema = await checkSchema();
  if (!schema.ready) return schema;
  if (environment.nodeEnv === "production" && !isUserDeletionConfigured(environment)) {
    return { ready: false, reason: "configuration-missing" };
  }
  return { ready: true };
}

/**
 * Liveness and readiness are deliberately two routes.
 *
 * `/health` answers "is this process running" and must never touch the
 * database — the deploy restart loop and Caddy both depend on it staying
 * answerable during a database outage. `/ready` answers "can this process
 * actually serve requests", which is the question nobody was asking while the
 * production database sat empty behind a green `/health` for days.
 */
export function createHealthRoutes(
  dependencies: HealthRouteDependencies = {},
): FastifyPluginAsync {
  const environment = dependencies.environment ?? config;
  const checkSchema = dependencies.checkSchema ?? (() => checkSchemaReady(getDb()));
  const checkReady = () => checkServiceReady(environment, checkSchema);

  return async (app) => {
    app.get<{ Reply: HealthResponse }>(
      "/health",
      { config: { rateLimit: false } },
      async () => ({
        ok: true,
        version: config.version,
        uptime: process.uptime(),
      }),
    );

    app.get<{ Reply: ReadyResponse }>(
      "/ready",
      { config: { rateLimit: false } },
      async (_request, reply) => {
        const result = await checkReady();
        if (!result.ready) {
          return reply.code(503).send({ ...result, version: config.version });
        }
        return { ...result, version: config.version };
      },
    );
  };
}

export const healthRoutes: FastifyPluginAsync = createHealthRoutes();
