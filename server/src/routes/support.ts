import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { analytics } from "../services/analytics.js";
import {
  createDrizzleFeatureRequestRepository,
  createDrizzleFeatureRequestVoteRepository,
  createDrizzleSupportSubmissionRepository,
  createFeatureRequestService,
  createFeatureRequestVoteService,
  createSupportSubmissionService,
} from "../support/index.js";
import type {
  FeatureRequestService,
  FeatureRequestVoteService,
  SupportSubmissionService,
} from "../support/index.js";
import { requireRouteUserId } from "./vendorRouteSupport.js";
import { sendSupportRouteError } from "./supportRouteError.js";

interface SupportRouteDependencies {
  featureRequests: FeatureRequestService;
  service: SupportSubmissionService;
  votes: FeatureRequestVoteService;
}

interface FeatureRequestParams {
  featureRequestId: string;
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
    app.get("/feature-requests", async (request, reply) => {
      const userId = await requireRouteUserId(request, reply);
      if (!userId) {
        return;
      }

      try {
        return await dependencies.featureRequests.list(userId);
      } catch (error) {
        await sendSupportRouteError(reply, error);
      }
    });

    app.post<{ Params: FeatureRequestParams }>(
      "/feature-requests/:featureRequestId/votes",
      async (request, reply) => {
        const userId = await requireRouteUserId(request, reply);
        if (!userId) {
          return;
        }

        try {
          const result = await dependencies.votes.vote(
            userId,
            request.params.featureRequestId,
          );
          return reply
            .code(result.status === "voted" ? 201 : 200)
            .send(result);
        } catch (error) {
          await sendSupportRouteError(reply, error);
        }
      },
    );

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
        const result = await dependencies.service.submit(userId, parsed.data);
        return reply.code(201).send(result);
      } catch (error) {
        await sendSupportRouteError(reply, error);
      }
    });
  };
}

export const supportRoutes = createSupportRoutes({
  service: {
    submit(userId, input) {
      return createSupportSubmissionService({
        analytics,
        repository: createDrizzleSupportSubmissionRepository(),
      }).submit(userId, input);
    },
  },
  featureRequests: {
    list(userId) {
      return createFeatureRequestService({
        repository: createDrizzleFeatureRequestRepository(),
      }).list(userId);
    },
  },
  votes: {
    vote(userId, featureRequestId) {
      return createFeatureRequestVoteService({
        repository: createDrizzleFeatureRequestVoteRepository(),
      }).vote(userId, featureRequestId);
    },
  },
});
