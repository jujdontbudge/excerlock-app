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
  requireRouteIdentity,
  requireRouteUserId,
} from "./authenticatedUser.js";

interface UserRouteDependencies {
  deletion: UserDeletionService;
  identity: IdentityRepository;
}

export interface UserResponse {
  id: string;
  isAnonymous: boolean;
  createdAt: string;
}

const accountDeleted = {
  error: {
    code: "ACCOUNT_DELETED",
    message: "This account has been deleted",
  },
} as const;

export function createUserRoutes(
  dependencies: UserRouteDependencies,
): FastifyPluginAsync {
  return async (app) => {
    app.get("/user", async (request, reply) => {
      const identity = await requireRouteIdentity(request, reply);
      if (!identity) {
        return;
      }

      let user;
      try {
        user = await dependencies.identity.findUser(identity.userId);
      } catch {
        return reply.code(503).send({
          error: {
            code: "IDENTITY_UNAVAILABLE",
            message: "Account lookup is temporarily unavailable",
          },
        });
      }

      if (!user) {
        return reply.code(404).send({
          error: {
            code: "USER_NOT_FOUND",
            message: "This account has not been provisioned; call PUT /v1/user",
          },
        });
      }
      if (user.deletedAt) {
        return reply.code(410).send(accountDeleted);
      }

      return {
        id: identity.userId,
        // The token is the authority on anonymity, not a stored copy: linking
        // a provider changes the claim without changing the user id.
        isAnonymous: identity.isAnonymous,
        createdAt: user.createdAt.toISOString(),
      } satisfies UserResponse;
    });

    app.put("/user", async (request, reply) => {
      const userId = await requireRouteUserId(request, reply);
      if (!userId) {
        return;
      }
      try {
        await dependencies.identity.ensureActiveUser(userId);
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof DeletedIdentityError) {
          return reply.code(410).send(accountDeleted);
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
    findUser(userId) {
      return createDrizzleIdentityRepository().findUser(userId);
    },
  },
  deletion: {
    async deleteAccount(userId) {
      await createConfiguredUserDeletionService().deleteAccount(userId);
    },
  },
});
