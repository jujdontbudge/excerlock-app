import type { FastifyPluginAsync, FastifyReply } from "fastify";
import type { z } from "zod";
import { DeletedIdentityError } from "../identity/index.js";
import {
  createDrizzleSyncRepository,
  earnedUnlocksRequest,
  historyDaysRequest,
  MAX_SYNC_BATCH,
  profileRequest,
  ruleDaysRequest,
  rulesRequest,
  usageDaysRequest,
  type SyncRepository,
} from "../sync/index.js";

interface SyncRouteDependencies {
  sync: SyncRepository;
}

/**
 * Rejecting an oversized batch before parsing keeps the failure legible: the
 * device learns it must page, rather than reading a validation error about
 * element 401.
 */
function batchLength(body: unknown, field: string): number | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const value = (body as Record<string, unknown>)[field];
  return Array.isArray(value) ? value.length : null;
}

async function sendBatchTooLarge(
  reply: FastifyReply,
  received: number,
): Promise<void> {
  await reply.code(400).send({
    error: {
      code: "SYNC_BATCH_TOO_LARGE",
      message: `A sync batch holds at most ${MAX_SYNC_BATCH} rows; received ${received}`,
    },
  });
}

async function sendInvalidPayload(
  reply: FastifyReply,
  error: z.ZodError,
): Promise<void> {
  const [issue] = error.issues;
  const path = issue?.path.join(".") ?? "";
  await reply.code(400).send({
    error: {
      code: "INVALID_SYNC_PAYLOAD",
      // The path, never the value: a rejected payload must not be echoed into
      // the logs of whatever reads this response.
      message: path
        ? `Sync payload is invalid at ${path}: ${issue?.message ?? "unexpected value"}`
        : "Sync payload is invalid",
    },
  });
}

async function sendSyncError(
  reply: FastifyReply,
  error: unknown,
): Promise<void> {
  if (error instanceof DeletedIdentityError) {
    await reply.code(410).send({
      error: {
        code: "ACCOUNT_DELETED",
        message: "This account has been deleted",
      },
    });
    return;
  }
  await reply.code(503).send({
    error: {
      code: "SYNC_UNAVAILABLE",
      message: "Sync is temporarily unavailable",
    },
  });
}

export function createSyncRoutes(
  dependencies: SyncRouteDependencies,
): FastifyPluginAsync {
  return async (app) => {
    /**
     * One shape for every write endpoint: cap the batch, validate strictly,
     * hand the rows to the repository, report what landed.
     */
    function writeRoute<Schema extends z.ZodType>(options: {
      url: string;
      schema: Schema;
      field: string;
      apply: (
        userId: string,
        parsed: z.infer<Schema>,
      ) => Promise<unknown>;
    }): void {
      app.put<{ Body: unknown }>(options.url, async (request, reply) => {
        const userId = request.authIdentity?.userId;
        if (!userId) {
          return reply.code(401).send({
            error: {
              code: "UNAUTHORIZED",
              message: "A verified Supabase user is required",
            },
          });
        }

        const received = batchLength(request.body, options.field);
        if (received !== null && received > MAX_SYNC_BATCH) {
          return sendBatchTooLarge(reply, received);
        }

        const parsed = options.schema.safeParse(request.body);
        if (!parsed.success) {
          return sendInvalidPayload(reply, parsed.error);
        }

        try {
          return await options.apply(userId, parsed.data);
        } catch (error) {
          await sendSyncError(reply, error);
        }
      });
    }

    app.get("/sync", async (request, reply) => {
      const userId = request.authIdentity?.userId;
      if (!userId) {
        return reply.code(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "A verified Supabase user is required",
          },
        });
      }

      try {
        return await dependencies.sync.read(userId);
      } catch (error) {
        await sendSyncError(reply, error);
      }
    });

    writeRoute({
      url: "/sync/rules",
      schema: rulesRequest,
      field: "rules",
      apply: (userId, parsed) =>
        dependencies.sync.upsertRules(userId, parsed.rules),
    });

    writeRoute({
      url: "/sync/rule-days",
      schema: ruleDaysRequest,
      field: "rows",
      apply: (userId, parsed) =>
        dependencies.sync.upsertRuleDays(userId, parsed.rows),
    });

    writeRoute({
      url: "/sync/usage-days",
      schema: usageDaysRequest,
      field: "rows",
      apply: (userId, parsed) =>
        dependencies.sync.upsertUsageDays(userId, parsed.rows),
    });

    writeRoute({
      url: "/sync/earned-unlocks",
      schema: earnedUnlocksRequest,
      field: "rows",
      apply: (userId, parsed) =>
        dependencies.sync.upsertEarnedUnlocks(userId, parsed.rows),
    });

    writeRoute({
      url: "/sync/history",
      schema: historyDaysRequest,
      field: "rows",
      apply: (userId, parsed) =>
        dependencies.sync.upsertHistoryDays(userId, parsed.rows),
    });

    writeRoute({
      url: "/sync/profile",
      schema: profileRequest,
      field: "profile",
      apply: (userId, parsed) =>
        dependencies.sync.upsertProfile(userId, parsed.profile),
    });
  };
}

export const syncRoutes = createSyncRoutes({
  sync: {
    upsertRules: (userId, rules) =>
      createDrizzleSyncRepository().upsertRules(userId, rules),
    upsertRuleDays: (userId, ruleDays) =>
      createDrizzleSyncRepository().upsertRuleDays(userId, ruleDays),
    upsertUsageDays: (userId, usageDays) =>
      createDrizzleSyncRepository().upsertUsageDays(userId, usageDays),
    upsertEarnedUnlocks: (userId, earnedUnlocks) =>
      createDrizzleSyncRepository().upsertEarnedUnlocks(userId, earnedUnlocks),
    upsertHistoryDays: (userId, historyDays) =>
      createDrizzleSyncRepository().upsertHistoryDays(userId, historyDays),
    upsertProfile: (userId, profile) =>
      createDrizzleSyncRepository().upsertProfile(userId, profile),
    read: (userId) => createDrizzleSyncRepository().read(userId),
  },
});
