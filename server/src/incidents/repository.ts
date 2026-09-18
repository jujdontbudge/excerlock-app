export interface NewIncidentReportRecord {
  id: string;
  userId: string;
  appVersion: string;
  appBuild: string;
  osVersion: string | null;
  whatWentWrong: string;
  shouldHaveHappened: string;
  diagnostics: Record<string, unknown>;
  reportedAt: Date;
  createdAt: Date;
}

export interface IncidentReportRepository {
  userExists(userId: string): Promise<boolean>;
  insertIncidentReport(report: NewIncidentReportRecord): Promise<void>;
}
