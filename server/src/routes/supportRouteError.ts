import type { FastifyReply } from "fastify";
import {
  FeatureRequestNotFoundError,
  SupportUserNotFoundError,
} from "../support/index.js";

export async function sendSupportRouteError(
  reply: FastifyReply,
  error: unknown,
): Promise<void> {
  if (error instanceof SupportUserNotFoundError) {
    await reply.code(404).send({
      error: {
        code: error.code,
        message: "The authenticated user does not exist",
      },
    });
    return;
  }

  if (error instanceof FeatureRequestNotFoundError) {
    await reply.code(404).send({
      error: {
        code: error.code,
        message: "The feature request does not exist",
      },
    });
    return;
  }

  throw error;
}
