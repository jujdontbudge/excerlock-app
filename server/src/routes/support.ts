import type { FastifyPluginAsync } from "fastify";
import {
  sendNotImplemented,
  type NotImplementedResponse,
} from "./notImplemented.js";

export const supportRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Reply: NotImplementedResponse }>("/support", async (_request, reply) =>
    sendNotImplemented(reply, "Support"),
  );
};
