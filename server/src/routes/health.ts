import type { FastifyPluginAsync } from "fastify";
import { config } from "../config.js";

export interface HealthResponse {
  ok: true;
  version: string;
  uptime: number;
}

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: HealthResponse }>("/health", async () => ({
    ok: true,
    version: config.version,
    uptime: process.uptime(),
  }));
};
