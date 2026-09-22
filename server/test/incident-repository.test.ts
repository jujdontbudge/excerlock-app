import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { incidentReports, users } from "../src/db/schema.js";
import {
  createDrizzleIncidentReportRepository,
  createIncidentReportService,
} from "../src/incidents/index.js";
import { createPgliteTestDatabase } from "./pgliteTestDatabase.js";

let postgres: Awaited<ReturnType<typeof createPgliteTestDatabase>>;

beforeAll(async () => {
  postgres = await createPgliteTestDatabase();
}, 30_000);

beforeEach(async () => {
  await postgres.reset();
}, 30_000);

afterAll(async () => {
  await postgres.client.close();
}, 30_000);

describe("incident report persistence", () => {
  it("writes a report that can be read back with its diagnostics", async () => {
    await postgres.db.insert(users).values({ id: "user_1" });
    const service = createIncidentReportService({
      repository: createDrizzleIncidentReportRepository(postgres.db),
      randomId: () => "report-1",
      now: () => new Date("2026-09-18T10:16:00.000Z"),
    });

    const result = await service.submit("user_1", {
      whatWentWrong: "Locked during my walk.",
      shouldHaveHappened: "Open while walking.",
      app: { version: "1.0.0", build: "2" },
      reportedAt: "2026-09-18T10:15:00.000Z",
      diagnostics: {
        lock: { state: "shield" },
        events: [{ at: "2026-09-18T10:00:00.000Z", state: "shield" }],
      },
    });

    const rows = await postgres.db
      .select()
      .from(incidentReports)
      .where(eq(incidentReports.userId, "user_1"));
    expect(result).toEqual({ reportId: "report-1" });
    expect(rows).toEqual([
      {
        id: "report-1",
        userId: "user_1",
        appVersion: "1.0.0",
        appBuild: "2",
        osVersion: null,
        whatWentWrong: "Locked during my walk.",
        shouldHaveHappened: "Open while walking.",
        diagnostics: {
          lock: { state: "shield" },
          events: [{ at: "2026-09-18T10:00:00.000Z", state: "shield" }],
        },
        reportedAt: new Date("2026-09-18T10:15:00.000Z"),
        createdAt: new Date("2026-09-18T10:16:00.000Z"),
      },
    ]);
  });

  it("treats a deleted user as missing", async () => {
    await postgres.db
      .insert(users)
      .values({ id: "user_gone", deletedAt: new Date() });
    const repository = createDrizzleIncidentReportRepository(postgres.db);
    await expect(repository.userExists("user_gone")).resolves.toBe(false);
  });

  it("cascades reports away with their user", async () => {
    await postgres.db.insert(users).values({ id: "user_2" });
    await createDrizzleIncidentReportRepository(postgres.db).insertIncidentReport({
      id: "report-2",
      userId: "user_2",
      appVersion: "1.0.0",
      appBuild: "2",
      osVersion: null,
      whatWentWrong: "x",
      shouldHaveHappened: "y",
      diagnostics: {},
      reportedAt: new Date(),
      createdAt: new Date(),
    });
    await postgres.db.delete(users).where(eq(users.id, "user_2"));
    expect(await postgres.db.select().from(incidentReports)).toEqual([]);
  });
});
