import type { FastifyReply } from "fastify";
import {
  FeatureRequestNotFoundError,
  SupportUserNotFoundError,
} from "../support/index.js";

function isDeletedIdentityError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  if (error instanceof Error) {
    if (
      error.name === "DeletedIdentityError" ||
      error.message.includes("Deleted identity") ||
      error.message.includes("User is deleted")
    ) {
      return true;
    }
  }
  return false;
}

export async function sendSupportRouteError(
  reply: FastifyReply,
  error: unknown,
): Promise<void> {
  if (isDeletedIdentityError(error)) {
    await reply.code(410).send({
      error: {
        code: "ACCOUNT_DELETED",
        message: "This account has been deleted",
      },
    });
    return;
  }

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
