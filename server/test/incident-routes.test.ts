import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createIncidentReportRoutes,
  MAX_DIAGNOSTICS_CHARS,
} from "../src/routes/incidentReports.js";
import {
  IncidentDiagnosticsRejectedError,
  IncidentUserNotFoundError,
  type IncidentReportService,
} from "../src/incidents/index.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const validBody = {
  whatWentWrong: "Apps stayed locked after my walk.",
  shouldHaveHappened: "They should have unlocked when I hit 3,000 steps.",
  app: { version: "1.0.0", build: "2", osVersion: "18.5" },
  reportedAt: "2026-09-18T10:15:00.000Z",
  diagnostics: {
    lock: { state: "shield", openReason: null },
    walking: { phase: "inactive" },
    permissions: { motion: "granted" },
  },
};

async function buildApp(service: IncidentReportService, userId: string | null = "user_123") {
  app = Fastify({ logger: false });
  app.addHook("onRequest", async (request) => {
    if (userId) request.clerkIdentity = { userId, roles: [] };
  });
  await app.register(createIncidentReportRoutes({ reports: service }), {
    prefix: "/v1",
  });
  return app;
}

describe("incident report routes", () => {
  it("persists an authenticated report and returns its id", async () => {
    const submit = vi.fn(async () => ({ reportId: "report-1" }));
    await buildApp({ submit });

    const response = await app!.inject({
      method: "POST",
      url: "/v1/incident-reports",
      payload: validBody,
    });

    expect({
      status: response.statusCode,
      body: response.json(),
      calls: submit.mock.calls,
    }).toEqual({
      status: 201,
      body: { reportId: "report-1" },
      calls: [["user_123", validBody]],
    });
  });

  it("rejects an unauthenticated request before touching the service", async () => {
    const submit = vi.fn();
    await buildApp({ submit }, null);

    const response = await app!.inject({
      method: "POST",
      url: "/v1/incident-reports",
      payload: validBody,
    });

    expect(response.statusCode).toBe(401);
    expect(submit).not.toHaveBeenCalled();
  });

  it.each([
    ["missing expected outcome", { ...validBody, shouldHaveHappened: "   " }],
    ["missing app build", { ...validBody, app: { version: "1.0.0" } }],
    ["unknown top-level key", { ...validBody, email: "a@b.c" }],
    ["invalid timestamp", { ...validBody, reportedAt: "yesterday" }],
    ["diagnostics not an object", { ...validBody, diagnostics: "lots" }],
    [
      "oversized diagnostics",
      { ...validBody, diagnostics: { blob: "x".repeat(MAX_DIAGNOSTICS_CHARS) } },
    ],
  ])("returns 400 for %s", async (_label, payload) => {
    const submit = vi.fn();
    await buildApp({ submit });

    const response = await app!.inject({
      method: "POST",
      url: "/v1/incident-reports",
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_INCIDENT_REPORT");
    expect(submit).not.toHaveBeenCalled();
  });

  it("maps a forbidden diagnostics key to 400 DIAGNOSTICS_REJECTED", async () => {
    await buildApp({
      submit: vi.fn(async () => {
        throw new IncidentDiagnosticsRejectedError("diagnostics.gym.latitude");
      }),
    });

    const response = await app!.inject({
      method: "POST",
      url: "/v1/incident-reports",
      payload: validBody,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "DIAGNOSTICS_REJECTED",
        message: "Diagnostics contain a forbidden key at diagnostics.gym.latitude",
      },
    });
  });

  it("returns 404 for an authenticated user absent from storage", async () => {
    await buildApp({
      submit: vi.fn(async () => {
        throw new IncidentUserNotFoundError("missing");
      }),
    });

    const response = await app!.inject({
      method: "POST",
      url: "/v1/incident-reports",
      payload: validBody,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("USER_NOT_FOUND");
  });
});
