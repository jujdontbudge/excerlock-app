import type { IncidentDiagnostics } from './incidentDiagnostics';
import type { IncidentReportReceipt } from '../ports/IncidentReportPort';

export type IncidentReportPayload = {
  whatWentWrong: string;
  shouldHaveHappened: string;
  app: { version: string; build: string; osVersion?: string };
  reportedAt: string;
  diagnostics: IncidentDiagnostics;
};

export interface IncidentReportTransport {
  post(payload: IncidentReportPayload): Promise<IncidentReportReceipt>;
}

export class IncidentReportError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = 'IncidentReportError';
  }
}

export function createIncidentReportTransport(options: {
  apiBaseUrl: string;
  getAuthContext(): Promise<{ accessToken: string; userId: string } | null>;
  fetchImpl?: typeof fetch;
}): IncidentReportTransport {
  const base = options.apiBaseUrl.replace(/\/$/, '');
  return {
    async post(payload) {
      const auth = await options.getAuthContext();
      if (!auth) throw new IncidentReportError('Not signed in yet', null);
      const impl = options.fetchImpl ?? fetch;
      const response = await impl(`${base}/v1/incident-reports`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new IncidentReportError(`Incident report rejected (${response.status})`, response.status);
      const body = (await response.json()) as { reportId?: unknown };
      if (typeof body.reportId !== 'string') throw new IncidentReportError('Incident report receipt is missing', response.status);
      return { reportId: body.reportId };
    },
  };
}
