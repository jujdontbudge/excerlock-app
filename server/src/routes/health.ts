import type { FastifyPluginAsync } from "fastify";
import { config } from "../config.js";
import { getDb } from "../db/index.js";
import { checkSchemaReady, type ReadinessResult } from "../db/readiness.js";

export interface HealthResponse {
  ok: true;
  version: string;
  uptime: number;
}

export type ReadyResponse = ReadinessResult & { version: string };

interface HealthRouteDependencies {
  checkReady?: () => Promise<ReadinessResult>;
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
  const checkReady =
    dependencies.checkReady ?? (() => checkSchemaReady(getDb()));

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
