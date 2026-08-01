import type { FastifyPluginAsync } from "fastify";
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
import { requireRouteUserId } from "./vendorRouteSupport.js";

interface UserRouteDependencies {
  deletion: UserDeletionService;
}

export function createUserRoutes(
  dependencies: UserRouteDependencies,
): FastifyPluginAsync {
  return async (app) => {
    app.get<{ Reply: NotImplementedResponse }>(
      "/user",
      async (_request, reply) => sendNotImplemented(reply, "User"),
    );

    app.delete("/user", async (request, reply) => {
      const userId = await requireRouteUserId(request, reply);
      if (!userId) {
        return;
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
  deletion: {
    async deleteAccount(userId) {
      await createConfiguredUserDeletionService().deleteAccount(userId);
    },
  },
});
