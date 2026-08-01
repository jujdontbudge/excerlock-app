import type { FastifyPluginAsync } from "fastify";
import {
  sendNotImplemented,
  type NotImplementedResponse,
} from "./notImplemented.js";
import { requireRouteUserId } from "./vendorRouteSupport.js";

export interface UserDeletionService {
  deleteAccount(userId: string): Promise<void>;
}

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

      await dependencies.deletion.deleteAccount(userId);
      return reply.code(204).send();
    });
  };
}

export const userRoutes = createUserRoutes({
  deletion: {
    async deleteAccount() {
      throw new Error("Account deletion is not configured");
    },
  },
});
