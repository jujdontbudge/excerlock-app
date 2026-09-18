import { createIncidentReportTransport, IncidentReportError, type IncidentReportPayload } from '../IncidentReportClient';
import { createIncidentReportPort } from '../createIncidentReportPort';
import type { IncidentDiagnostics } from '../incidentDiagnostics';

const diagnostics = { capturedAt: '2026-09-18T10:15:00.000Z', lock: null } as unknown as IncidentDiagnostics;
const payload: IncidentReportPayload = {
  whatWentWrong: 'Locked.',
  shouldHaveHappened: 'Open.',
  app: { version: '1.0.0', build: '2' },
  reportedAt: '2026-09-18T10:15:00.000Z',
  diagnostics,
};

function response(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

test('posts the payload with the bearer to /v1/incident-reports and returns the receipt', async () => {
  const fetchImpl = jest.fn(async () => response(201, { reportId: 'r-1' }));
  const transport = createIncidentReportTransport({
    apiBaseUrl: 'https://api.example.com/',
    getAuthContext: async () => ({ accessToken: 'jwt-abc', userId: 'user-1' }),
    fetchImpl,
  });
  await expect(transport.post(payload)).resolves.toEqual({ reportId: 'r-1' });
  const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('https://api.example.com/v1/incident-reports');
  expect(init.method).toBe('POST');
  expect(init.headers).toEqual({ Authorization: 'Bearer jwt-abc', 'Content-Type': 'application/json' });
  expect(JSON.parse(String(init.body))).toEqual(payload);
});

test('refuses without an auth context and surfaces server rejections', async () => {
  const fetchImpl = jest.fn(async () => response(400, { error: { code: 'DIAGNOSTICS_REJECTED' } }));
  const unauthenticated = createIncidentReportTransport({
    apiBaseUrl: 'https://api.example.com',
    getAuthContext: async () => null,
    fetchImpl,
  });
  await expect(unauthenticated.post(payload)).rejects.toBeInstanceOf(IncidentReportError);
  expect(fetchImpl).not.toHaveBeenCalled();
  const rejected = createIncidentReportTransport({
    apiBaseUrl: 'https://api.example.com',
    getAuthContext: async () => ({ accessToken: 'jwt', userId: 'u' }),
    fetchImpl,
  });
  await expect(rejected.post(payload)).rejects.toMatchObject({ name: 'IncidentReportError', status: 400 });
});

test('the port collects the snapshot at send time and hands one payload to the transport', async () => {
  const post = jest.fn(async () => ({ reportId: 'r-2' }));
  const port = createIncidentReportPort({
    transport: { post },
    collect: async () => diagnostics,
    app: { version: '1.0.0', build: '2', osVersion: '18.5' },
    now: () => Date.parse('2026-09-18T10:15:00.000Z'),
  });
  await expect(port.send({ whatWentWrong: ' Locked. ', shouldHaveHappened: 'Open.' })).resolves.toEqual({ reportId: 'r-2' });
  expect(post).toHaveBeenCalledWith({
    whatWentWrong: 'Locked.',
    shouldHaveHappened: 'Open.',
    app: { version: '1.0.0', build: '2', osVersion: '18.5' },
    reportedAt: '2026-09-18T10:15:00.000Z',
    diagnostics,
  });
});
