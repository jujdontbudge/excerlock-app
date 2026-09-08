import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { analytics } from "../services/analytics.js";
import {
  createDrizzleSupportSubmissionRepository,
  createSupportSubmissionService,
} from "../support/index.js";
import type { SupportSubmissionService } from "../support/index.js";
import { requireRouteUserId } from "./authenticatedUser.js";
import { sendSupportRouteError } from "./supportRouteError.js";

interface SupportRouteDependencies {
  submissions: SupportSubmissionService;
}

const supportSubmissionBody = z.discriminatedUnion("category", [
  z
    .object({
      category: z.enum(["support", "bug"]),
      message: z.string().trim().min(1).max(4_000),
    })
    .strict(),
  z
    .object({
      category: z.literal("feature"),
      title: z.string().trim().min(1).max(120),
      message: z.string().trim().min(1).max(4_000),
    })
    .strict(),
]);

export function createSupportRoutes(
  dependencies: SupportRouteDependencies,
): FastifyPluginAsync {
  return async (app) => {
    app.post<{ Body: unknown }>("/support", async (request, reply) => {
      const userId = await requireRouteUserId(request, reply);
      if (!userId) {
        return;
      }

      const parsed = supportSubmissionBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: {
            code: "INVALID_SUPPORT_REQUEST",
            message:
              "Expected category support, bug, or feature and a non-empty message; feature requests also require a title",
          },
        });
      }

      try {
        const result = await dependencies.submissions.submit(
          userId,
          parsed.data,
        );
        return reply.code(201).send(result);
      } catch (error) {
        await sendSupportRouteError(reply, error);
      }
    });
  };
}

export const supportRoutes = createSupportRoutes({
  submissions: {
    submit(userId, input) {
      return createSupportSubmissionService({
        analytics,
        repository: createDrizzleSupportSubmissionRepository(),
      }).submit(userId, input);
    },
  },
});
