import type { FastifyPluginAsync } from "fastify";

export interface HealthResponse {
  ok: true;
  version: string;
  uptime: number;
}

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: HealthResponse }>("/health", async () => ({
    ok: true,
    version: "0.1.0",
    uptime: process.uptime(),
  }));
};
