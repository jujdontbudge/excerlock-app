import type { FastifyPluginAsync } from "fastify";
import { analytics } from "../services/analytics.js";
import {
  createDrizzleSupportSubmissionRepository,
  createSupportSubmissionService,
  supportSubmissionRequest,
} from "../support/index.js";
import type { SupportSubmissionService } from "../support/index.js";
import { requireRouteUserId } from "./authenticatedUser.js";
import { sendSupportRouteError } from "./supportRouteError.js";

interface SupportRouteDependencies {
  submissions: SupportSubmissionService;
}

export function createSupportRoutes(
  dependencies: SupportRouteDependencies,
): FastifyPluginAsync {
  return async (app) => {
    app.post<{ Body: unknown }>("/support", async (request, reply) => {
      const userId = await requireRouteUserId(request, reply);
      if (!userId) {
        return;
      }

      const parsed = supportSubmissionRequest.safeParse(request.body);
      if (!parsed.success) {
        const [issue] = parsed.error.issues;
        const path = issue?.path.join(".") ?? "";
        return reply.code(400).send({
          error: {
            code: "INVALID_SUPPORT_REQUEST",
            // The path, never the value: a rejected diagnostics bundle must
            // not be echoed into whatever reads this response.
            message: path
              ? `Support request is invalid at ${path}: ${issue?.message ?? "unexpected value"}`
              : "Support request is invalid",
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
