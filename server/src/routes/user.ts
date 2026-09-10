import type { FastifyPluginAsync } from "fastify";
import {
  createDrizzleIdentityRepository,
  DeletedIdentityError,
  type IdentityRepository,
} from "../identity/index.js";
import {
  createConfiguredUserDeletionService,
  IdentityErasureRequestError,
  type UserDeletionService,
  UserDeletionConfigurationError,
} from "../userDeletion/index.js";
import {
  sendNotImplemented,
  type NotImplementedResponse,
} from "./notImplemented.js";
import {
  requireActiveRouteUserId,
  requireRouteUserId,
} from "./vendorRouteSupport.js";

interface UserRouteDependencies {
  deletion: UserDeletionService;
  identity: IdentityRepository;
}

export function createUserRoutes(
  dependencies: UserRouteDependencies,
): FastifyPluginAsync {
  return async (app) => {
    app.get<{ Reply: NotImplementedResponse }>(
      "/user",
      async (_request, reply) => sendNotImplemented(reply, "User"),
    );

    app.put("/user", async (request, reply) => {
      // Identity comes ONLY from the verified token. Any userId in the
      // body is ignored by design: callers cannot provision or migrate an
      // arbitrary source UID. Existing-account recovery adopts the
      // destination session UID via returning-account sign-in; there is no
      // silent subscription transfer endpoint (see userDeletion README and
      // T04 contract). Tombstoned callers receive 410 even with a
      // not-yet-expired JWT.
      const userId = await requireActiveRouteUserId(request, reply);
      if (!userId) {
        return;
      }
      try {
        await dependencies.identity.ensureActiveUser(userId);
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof DeletedIdentityError) {
          return reply.code(410).send({
            error: {
              code: "ACCOUNT_DELETED",
              message: "This account has been deleted",
            },
          });
        }
        return reply.code(503).send({
          error: {
            code: "IDENTITY_UNAVAILABLE",
            message: "Account registration is temporarily unavailable",
          },
        });
      }
    });

    app.delete("/user", async (request, reply) => {
      // DELETE intentionally uses the non-tombstone gate: a tombstoned
      // caller with a still-valid JWT must be able to resume the durable
      // workflow to completion. The worker finishes provider-last gaps
      // without any client token.
      const userId = await requireRouteUserId(request, reply);
      if (!userId) {
        return;
      }
      if (request.authIdentity?.provider === "clerk") {
        return reply.code(409).send({
          error: {
            code: "ACCOUNT_DELETION_PROVIDER_UNSUPPORTED",
            message: "Sign in with the current account provider before deleting this account",
          },
        });
      }

      try {
        await dependencies.deletion.deleteAccount(userId);
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof UserDeletionConfigurationError) {
          return reply.code(503).send({
            error: {
              code: "ACCOUNT_DELETION_UNAVAILABLE",
              message: "Account deletion is temporarily unavailable",
            },
          });
        }
        if (error instanceof IdentityErasureRequestError) {
          return reply.code(502).send({
            error: {
              code: "IDENTITY_ERASURE_FAILED",
              message: "Account deletion is incomplete; retry safely",
            },
          });
        }
        return reply.code(500).send({
          error: {
            code: "ACCOUNT_DELETION_FAILED",
            message: "Account deletion is incomplete; retry safely",
          },
        });
      }
    });
  };
}

export const userRoutes = createUserRoutes({
  identity: {
    async ensureActiveUser(userId) {
      await createDrizzleIdentityRepository().ensureActiveUser(userId);
    },
  },
  deletion: {
    async deleteAccount(userId) {
      await createConfiguredUserDeletionService().deleteAccount(userId);
    },
  },
});
