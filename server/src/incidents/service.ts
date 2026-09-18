import { randomUUID } from "node:crypto";
import { findForbiddenDiagnosticKey } from "./diagnostics.js";
import {
  IncidentDiagnosticsRejectedError,
  IncidentUserNotFoundError,
} from "./errors.js";
import type {
  IncidentReportRepository,
  NewIncidentReportRecord,
} from "./repository.js";

export type IncidentReportInput = Readonly<{
  whatWentWrong: string;
  shouldHaveHappened: string;
  app: Readonly<{ version: string; build: string; osVersion?: string | undefined }>;
  reportedAt: string;
  diagnostics: Record<string, unknown>;
}>;

export type IncidentReportResult = Readonly<{ reportId: string }>;

export interface IncidentReportServiceOptions {
  repository: IncidentReportRepository;
  notify?: (record: NewIncidentReportRecord) => Promise<boolean>;
  now?: () => Date;
  randomId?: () => string;
}

export interface IncidentReportService {
  submit(
    userId: string,
    input: IncidentReportInput,
  ): Promise<IncidentReportResult>;
}

export function createIncidentReportService(
  options: IncidentReportServiceOptions,
): IncidentReportService {
  const now = options.now ?? (() => new Date());
  const randomId = options.randomId ?? randomUUID;

  return {
    async submit(userId, input) {
      const forbidden = findForbiddenDiagnosticKey(input.diagnostics);
      if (forbidden) {
        throw new IncidentDiagnosticsRejectedError(forbidden);
      }
      if (!(await options.repository.userExists(userId))) {
        throw new IncidentUserNotFoundError(userId);
      }

      const record: NewIncidentReportRecord = {
        id: randomId(),
        userId,
        appVersion: input.app.version,
        appBuild: input.app.build,
        osVersion: input.app.osVersion ?? null,
        whatWentWrong: input.whatWentWrong,
        shouldHaveHappened: input.shouldHaveHappened,
        diagnostics: input.diagnostics,
        reportedAt: new Date(input.reportedAt),
        createdAt: now(),
      };

      await options.repository.insertIncidentReport(record);
      void options.notify?.(record).catch(() => {});

      return { reportId: record.id };
    },
  };
}
