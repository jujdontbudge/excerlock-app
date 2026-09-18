/** The two things a person can tell us, in their own words. */
export type IncidentReportInput = { whatWentWrong: string; shouldHaveHappened: string };
export type IncidentReportReceipt = { reportId: string };
export interface IncidentReportPort {
  /** Sends the words plus the diagnostic snapshot the app holds right now. Rejects visibly; nothing is queued. */
  send(input: IncidentReportInput): Promise<IncidentReportReceipt>;
}
