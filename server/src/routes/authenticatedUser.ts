import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthIdentity } from "../auth.js";

/**
 * Every authenticated route reads its subject through these two accessors, so
 * the identity provider is a single import away from being swapped again.
 */
export async function requireRouteIdentity(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthIdentity | null> {
  const identity = request.authIdentity;
  if (!identity?.userId) {
    await reply.code(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "A verified Supabase user is required",
      },
    });
    return null;
  }
  return identity;
}

export async function requireRouteUserId(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  return (await requireRouteIdentity(request, reply))?.userId ?? null;
}
