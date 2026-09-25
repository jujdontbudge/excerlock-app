import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, users } from "../packages/db/index.js";
import { isVendor, VendorClientError, type Vendor } from "../packages/vendors/index.js";

export function verifiedRouteUserId(request: FastifyRequest): string | null {
  return request.authIdentity?.userId ?? request.clerkIdentity?.userId ?? null;
}

export async function requireRouteUserId(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  const userId = verifiedRouteUserId(request);
  if (!userId) {
    await reply.code(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "A verified user is required",
      },
    });
    return null;
  }
  return userId;
}

export interface TombstoneChecker {
  (userId: string): Promise<boolean>;
}

async function defaultTombstoneCheck(userId: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }
  const [row] = await db
    .select({ deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.deletedAt != null;
}

export async function requireActiveRouteUserId(
  request: FastifyRequest,
  reply: FastifyReply,
  isTombstoned: TombstoneChecker = defaultTombstoneCheck,
): Promise<string | null> {
  const userId = await requireRouteUserId(request, reply);
  if (!userId) {
    return null;
  }
  let tombstoned = false;
  try {
    tombstoned = await isTombstoned(userId);
  } catch {
    await reply.code(503).send({
      error: {
        code: "IDENTITY_UNAVAILABLE",
        message: "Identity status is temporarily unavailable",
      },
    });
    return null;
  }
  if (tombstoned) {
    await reply.code(410).send({
      error: {
        code: "ACCOUNT_DELETED",
        message: "This account has been deleted",
      },
    });
    return null;
  }
  return userId;
}

export function isTombstonedError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const message = error instanceof Error ? error.message : "";
  if (
    error instanceof Error &&
    (error.name === "DeletedIdentityError" ||
      message.includes("User is deleted") ||
      message.includes("Deleted identity"))
  ) {
    return true;
  }
  return (
    typeof message === "string" &&
    (message.includes("User is deleted or missing") ||
      message.includes("Deleted identity"))
  );
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
  if (isTombstonedError(error)) {
    await reply.code(410).send({
      error: {
        code: "ACCOUNT_DELETED",
        message: "This account has been deleted",
      },
    });
    return;
  }
  if (error instanceof VendorClientError) {
    await reply.code(error.statusCode).send({
      error: {
        code: "VENDOR_REQUEST_INVALID",
        message: "Vendor request is invalid",
      },
    });
    return;
  }
  const message = error instanceof Error ? error.message : "";
  const status =
    message.includes("not configured") ||
    message.includes("missing DATABASE_URL")
      ? 503
      : message.includes("upstream HTTP")
        ? 502
        : 500;

  await reply.code(status).send({
    error: {
      code:
        status === 503
          ? "VENDOR_NOT_CONFIGURED"
          : status === 502
            ? "VENDOR_UPSTREAM_ERROR"
            : "VENDOR_REQUEST_FAILED",
      message:
        status === 503
          ? "Vendor integration is not configured"
          : status === 502
            ? "Vendor provider is unavailable"
            : "Vendor request failed",
    },
  });
}
