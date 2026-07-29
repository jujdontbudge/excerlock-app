import { Sentry } from "./instrument.js";
import Fastify, {
  type FastifyInstance,
  type FastifyListenOptions,
  type FastifyServerOptions,
} from "fastify";
import { pathToFileURL } from "node:url";
import { healthRoutes } from "./routes/health.js";

export function buildServer(options: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify(options);
  void app.register(healthRoutes, { prefix: "/v1" });
  return app;
}

export async function listenServer(
  app: FastifyInstance = buildServer(),
  options: FastifyListenOptions = { host: "0.0.0.0", port: 3000 },
): Promise<FastifyInstance> {
  await app.listen(options);
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  listenServer().catch((error: unknown) => {
    Sentry.captureException(error);
    console.error("Fatal startup error:", error);
    process.exitCode = 1;
  });
}
