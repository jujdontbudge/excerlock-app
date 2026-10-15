import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { config } from "../packages/config/config.js";
import type { Environment } from "../packages/config/env.js";
import { createComplimentaryAccessRepository } from "../packages/subscriptions/index.js";

interface AccessRouteDependencies {
  environment?: Environment;
  repository?: ReturnType<typeof createComplimentaryAccessRepository>;
}

const lane = z.enum(["production", "sandbox"]).default("production");
const email = z.string().trim().toLowerCase().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
const note = z.string().trim().min(1).max(1000);

const grantBody = z.object({
  email,
  note,
  until: z.string().datetime({ offset: true }).optional(),
  environment: lane,
}).strict();

const revokeBody = z.object({ email, note, environment: lane }).strict();

const lookupQuery = z.object({ email, environment: lane }).strict();

const routeRateLimit = { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } };

function tokenLabel(request: FastifyRequest, environment: Environment): string | null {
  const header = request.headers.authorization ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const received = createHash("sha256").update(header.slice(7).trim()).digest();
  let label: string | null = null;
  for (const entry of environment.accessGrantTokenHashes) {
    if (timingSafeEqual(received, Buffer.from(entry.hash, "hex"))) label = entry.label;
  }
  return label;
}

function invalid(reply: FastifyReply, message: string) {
  return reply.code(400).send({ error: { code: "INVALID_REQUEST", message } });
}

export function createAccessRoutes(dependencies: AccessRouteDependencies = {}): FastifyPluginAsync {
  return async (app) => {
    const environment = dependencies.environment ?? config;
    if (environment.accessGrantTokenHashes.length === 0) return;
    const repository = () => dependencies.repository ?? createComplimentaryAccessRepository();

    app.addHook("onRequest", async (request, reply) => {
      const label = tokenLabel(request, environment);
      if (!label) return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "Unknown access token" } });
      request.accessActor = `token:${label}`;
    });

    app.post("/access/grants", routeRateLimit, async (request, reply) => {
      const parsed = grantBody.safeParse(request.body);
      if (!parsed.success) return invalid(reply, "Send email, note, optional until (ISO date with timezone) and optional environment");
      const expiresAt = parsed.data.until ? new Date(parsed.data.until) : null;
      if (expiresAt && expiresAt <= new Date()) return invalid(reply, "until must be in the future");
      const grant = await repository().grant({ email: parsed.data.email, note: parsed.data.note, environment: parsed.data.environment, actor: request.accessActor!, expiresAt });
      return reply.code(201).send({ id: grant.id, email: grant.email, environment: grant.environment, grantedAt: grant.grantedAt, expiresAt: grant.expiresAt });
    });

    app.post("/access/revocations", routeRateLimit, async (request, reply) => {
      const parsed = revokeBody.safeParse(request.body);
      if (!parsed.success) return invalid(reply, "Send email, note and optional environment");
      const result = await repository().revoke({ ...parsed.data, actor: request.accessActor! });
      return reply.send({ email: parsed.data.email, environment: parsed.data.environment, revoked: result.revoked });
    });

    app.get("/access/grants", routeRateLimit, async (request, reply) => {
      const parsed = lookupQuery.safeParse(request.query);
      if (!parsed.success) return invalid(reply, "Send one email and optional environment");
      const now = new Date();
      const rows = await repository().list(parsed.data.environment, parsed.data.email);
      const current = rows.find((row) => !row.revokedAt && (!row.expiresAt || row.expiresAt > now));
      return reply.send({
        email: parsed.data.email,
        environment: parsed.data.environment,
        active: Boolean(current),
        grantedAt: current?.grantedAt ?? null,
        expiresAt: current?.expiresAt ?? null,
        signedIn: Boolean(current?.matchedUserId),
      });
    });
  };
}

declare module "fastify" {
  interface FastifyRequest {
    accessActor?: string;
  }
}

export const accessRoutes = createAccessRoutes();
