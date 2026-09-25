import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  createDrizzleIncidentReportRepository,
  createIncidentReportService,
  IncidentDiagnosticsRejectedError,
  IncidentUserNotFoundError,
  sendIncidentEmail,
} from "../packages/incidents/index.js";
import type { IncidentReportService } from "../packages/incidents/index.js";
import { requireActiveRouteUserId } from "./vendorRouteSupport.js";
import { sendSupportRouteError } from "./supportRouteError.js";

interface IncidentReportRouteDependencies {
  reports: IncidentReportService;
}

export const MAX_DIAGNOSTICS_CHARS = 32_768;

const text = z.string().trim().min(1).max(4_000);

export const incidentReportBody = z
  .object({
    whatWentWrong: text,
    shouldHaveHappened: text,
    app: z
      .object({
        version: z.string().trim().min(1).max(40),
        build: z.string().trim().min(1).max(40),
        osVersion: z.string().trim().min(1).max(40).optional(),
      })
      .strict(),
    reportedAt: z.iso.datetime({ offset: true }),
    diagnostics: z
      .record(z.string(), z.unknown())
      .refine(
        (value) => JSON.stringify(value).length <= MAX_DIAGNOSTICS_CHARS,
        { message: "Diagnostics exceed the size limit" },
      ),
  })
  .strict();

export function createIncidentReportRoutes(
  dependencies: IncidentReportRouteDependencies,
): FastifyPluginAsync {
  return async (app) => {
    app.post<{ Body: unknown }>("/incident-reports", async (request, reply) => {
      const userId = await requireActiveRouteUserId(request, reply);
      if (!userId) {
        return;
      }

      const parsed = incidentReportBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: {
            code: "INVALID_INCIDENT_REPORT",
            message:
              "Expected whatWentWrong, shouldHaveHappened, app {version, build}, reportedAt and a bounded diagnostics object",
          },
        });
      }

      try {
        const result = await dependencies.reports.submit(userId, parsed.data);
        return reply.code(201).send(result);
      } catch (error) {
        if (error instanceof IncidentDiagnosticsRejectedError) {
          return reply.code(400).send({
            error: {
              code: error.code,
              message: `Diagnostics contain a forbidden key at ${error.path}`,
            },
          });
        }
        if (error instanceof IncidentUserNotFoundError) {
          return reply.code(404).send({
            error: {
              code: error.code,
              message: "The authenticated user does not exist",
            },
          });
        }
        await sendSupportRouteError(reply, error);
      }
    });
  };
}

export const incidentReportRoutes = createIncidentReportRoutes({
  reports: {
    submit(userId, input) {
      return createIncidentReportService({
        notify: sendIncidentEmail,
        repository: createDrizzleIncidentReportRepository(),
      }).submit(userId, input);
    },
  },
});
