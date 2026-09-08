import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Every authenticated route reads its subject through this one accessor, so
 * the identity provider is a single import away from being swapped again.
 */
export async function requireRouteUserId(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  const userId = request.authIdentity?.userId;
  if (!userId) {
    await reply.code(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "A verified Supabase user is required",
      },
    });
    return null;
  }
  return userId;
}
