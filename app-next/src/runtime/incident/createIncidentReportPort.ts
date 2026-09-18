import type { IncidentReportPort } from '../../ports/IncidentReportPort';
import type { IncidentDiagnostics } from './incidentDiagnostics';
import type { IncidentReportPayload, IncidentReportTransport } from './IncidentReportClient';

/** Pure assembly of the wire payload from the person's words and the app's snapshot. */
export function buildIncidentReportPayload(input: {
  whatWentWrong: string;
  shouldHaveHappened: string;
  app: { version: string; build: string; osVersion?: string };
  now: number;
  diagnostics: IncidentDiagnostics;
}): IncidentReportPayload {
  const whatWentWrong = input.whatWentWrong.trim(),
    shouldHaveHappened = input.shouldHaveHappened.trim();
  if (!whatWentWrong || !shouldHaveHappened) throw new Error('Both answers are required');
  return {
    whatWentWrong: whatWentWrong.slice(0, 4000),
    shouldHaveHappened: shouldHaveHappened.slice(0, 4000),
    app: input.app,
    reportedAt: new Date(input.now).toISOString(),
    diagnostics: input.diagnostics,
  };
}

export function createIncidentReportPort(options: {
  transport: IncidentReportTransport;
  collect(): Promise<IncidentDiagnostics>;
  app: { version: string; build: string; osVersion?: string };
  now?: () => number;
}): IncidentReportPort {
  return {
    async send(input) {
      const diagnostics = await options.collect();
      return options.transport.post(
        buildIncidentReportPayload({ ...input, app: options.app, now: options.now?.() ?? Date.now(), diagnostics }),
      );
    },
  };
}
