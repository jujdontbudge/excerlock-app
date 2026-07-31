import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "./config.js";

export interface ClerkIdentity {
  userId: string;
  roles: readonly string[];
}

declare module "fastify" {
  interface FastifyRequest {
    clerkIdentity?: ClerkIdentity;
  }
}

/**
 * Clerk verification boundary for the server skeleton.
 *
 * Ticket #34 establishes where verification lives; wiring Clerk's production
 * verifier is intentionally deferred to the user-route implementation.
 */
export async function verifyClerkJwt(
  _token: string,
  _secretKey: string,
): Promise<ClerkIdentity> {
  throw new Error("Clerk JWT verification is not implemented");
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const secretKey = config.clerkSecretKey;
  if (!secretKey) {
    await reply.code(503).send({
      error: {
        code: "AUTH_UNAVAILABLE",
        message: "Authentication is not configured",
      },
    });
    return;
  }

  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    await reply.code(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing Authorization: Bearer <token>",
      },
    });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();

  try {
    request.clerkIdentity = await verifyClerkJwt(token, secretKey);
  } catch {
    await reply.code(501).send({
      error: {
        code: "AUTH_NOT_IMPLEMENTED",
        message: "Clerk JWT verification is not implemented",
      },
    });
  }
}
