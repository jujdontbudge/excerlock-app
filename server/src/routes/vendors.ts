import type { FastifyPluginAsync } from "fastify";
import {
  sendNotImplemented,
  type NotImplementedResponse,
} from "./notImplemented.js";

export const vendorRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: NotImplementedResponse }>("/vendors", async (_request, reply) =>
    sendNotImplemented(reply, "Vendors"),
  );
};
