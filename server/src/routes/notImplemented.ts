import type { FastifyReply } from "fastify";

export interface NotImplementedResponse {
  error: {
    code: "NOT_IMPLEMENTED";
    message: string;
  };
}

export function sendNotImplemented(
  reply: FastifyReply,
  resource: string,
): NotImplementedResponse {
  const response: NotImplementedResponse = {
    error: {
      code: "NOT_IMPLEMENTED",
      message: `${resource} API is not implemented`,
    },
  };

  void reply.code(501);
  return response;
}
