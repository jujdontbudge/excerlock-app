export type IncidentReportInput = { whatWentWrong: string; shouldHaveHappened: string };
export type IncidentReportReceipt = { reportId: string };
export interface IncidentReportPort {
  send(input: IncidentReportInput): Promise<IncidentReportReceipt>;
}
