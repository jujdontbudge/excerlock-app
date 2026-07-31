import type { FastifyReply, FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "./config.js";

const CLERK_JWKS_URL = new URL("https://api.clerk.com/v1/jwks");

export interface ClerkIdentity {
  userId: string;
  roles: readonly string[];
}

declare module "fastify" {
  interface FastifyRequest {
    clerkIdentity?: ClerkIdentity;
  }
}

export async function verifyClerkJwt(
  token: string,
  secretKey: string,
): Promise<ClerkIdentity> {
  const clerkJwks = createRemoteJWKSet(CLERK_JWKS_URL, {
    headers: { authorization: `Bearer ${secretKey}` },
  });
  const { payload } = await jwtVerify(token, clerkJwks, {
    algorithms: ["RS256"],
  });

  if (typeof payload.sub !== "string" || payload.sub.trim().length === 0) {
    throw new Error("Clerk JWT is missing its subject");
  }

  const roles = Array.isArray(payload.roles)
    ? payload.roles.filter((role): role is string => typeof role === "string")
    : [];

  return Object.freeze({
    userId: payload.sub,
    roles: Object.freeze(roles),
  });
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
