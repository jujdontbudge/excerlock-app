import { and, eq, isNull } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { getDb } from "../db/client.js";
import { incidentReports, users } from "../db/schema.js";
import type { IncidentReportRepository } from "./repository.js";

type IncidentDatabase = PgDatabase<any, typeof import("../db/schema.js")>;

export function createDrizzleIncidentReportRepository(
  configuredDatabase: IncidentDatabase | null = getDb(),
): IncidentReportRepository {
  if (!configuredDatabase) {
    throw new Error(
      "Incident report persistence is not configured; missing DATABASE_URL",
    );
  }
  const database = configuredDatabase;

  return {
    async userExists(userId) {
      const [user] = await database
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);
      return user !== undefined;
    },

    async insertIncidentReport(report) {
      await database.insert(incidentReports).values({
        id: report.id,
        userId: report.userId,
        appVersion: report.appVersion,
        appBuild: report.appBuild,
        osVersion: report.osVersion,
        whatWentWrong: report.whatWentWrong,
        shouldHaveHappened: report.shouldHaveHappened,
        diagnostics: report.diagnostics,
        reportedAt: report.reportedAt,
        createdAt: report.createdAt,
      });
    },
  };
}
