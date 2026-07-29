import type { FastifyPluginAsync } from "fastify";
import {
  sendNotImplemented,
  type NotImplementedResponse,
} from "./notImplemented.js";

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: NotImplementedResponse }>("/user", async (_request, reply) =>
    sendNotImplemented(reply, "User"),
  );
};
