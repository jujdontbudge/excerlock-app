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
      const userId = await requireRouteUserId(request, reply);
      if (!userId) {
        return;
      }
      if (request.authIdentity?.provider === "clerk") {
        return reply.code(409).send({
          error: {
            code: "ACCOUNT_DELETION_PROVIDER_UNSUPPORTED",
            message: "Legacy Clerk account deletion is unsupported; migrate to Supabase before deleting this account",
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
