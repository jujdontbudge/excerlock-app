import type { FastifyReply, FastifyRequest } from "fastify";
import { isVendor, type Vendor } from "../vendors/index.js";

export async function requireRouteUserId(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  const userId = request.clerkIdentity?.userId;
  if (!userId) {
    await reply.code(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "A verified Clerk user is required",
      },
    });
    return null;
  }
  return userId;
}

export async function requireRouteVendor(
  vendor: string,
  reply: FastifyReply,
): Promise<Vendor | null> {
  if (!isVendor(vendor)) {
    await reply.code(404).send({
      error: {
        code: "UNKNOWN_VENDOR",
        message: `Unsupported vendor: ${vendor}`,
      },
    });
    return null;
  }
  return vendor;
}

export async function sendVendorRouteError(
  reply: FastifyReply,
  error: unknown,
): Promise<void> {
  const message =
    error instanceof Error ? error.message : "Vendor request failed";
  const status =
    message.includes("not configured") ||
    message.includes("missing DATABASE_URL")
      ? 503
      : message.includes("upstream HTTP")
        ? 502
        : 400;

  await reply.code(status).send({
    error: {
      code:
        status === 503
          ? "VENDOR_NOT_CONFIGURED"
          : status === 502
            ? "VENDOR_UPSTREAM_ERROR"
            : "VENDOR_REQUEST_INVALID",
      message,
    },
  });
}
