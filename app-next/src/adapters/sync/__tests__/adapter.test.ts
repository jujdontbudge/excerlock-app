import { rule } from '../../../domain/__tests__/fixtures';
import { batches, createSyncAdapter } from '../SyncAdapter';
import { createSyncClient, FetchLike, SyncError } from '../SyncClient';
import { paths } from '../wire';

const stamp = '2026-09-07T12:00:00.000Z';
const respond = (status: number, body: unknown = {}) => ({ ok: status < 400, status, json: async () => body });

function fetchMock(handler: (input: string, init: Parameters<FetchLike>[1]) => ReturnType<FetchLike>) {
  return jest.fn(handler) as jest.MockedFunction<FetchLike>;
}

const client = (fetch: FetchLike, token: string | null = 'jwt') =>
  createSyncClient({ accessToken: async () => token, baseUrl: 'https://api.test/', fetch });

test('batches split at the server limit and keep order', () => {
  const rows = Array.from({ length: 1000 }, (_, index) => index);
  const split = batches(rows);
  expect(split.map((batch) => batch.length)).toEqual([400, 400, 200]);
  expect(split.flat()).toEqual(rows);
  expect(batches([])).toEqual([]);
});

test('every call carries the bearer token and JSON headers against the base URL', async () => {
  const fetch = fetchMock(async () => respond(200));
  await createSyncAdapter(client(fetch)).pushProfile({
    name: 'Alex',
    referralSource: '',
    ageBand: '',
    occupation: '',
    improveFirst: 'exercise',
    mainReason: '',
    estimatedDailyMinutes: 180,
    units: 'km',
    updatedAt: stamp,
  });
  expect(fetch).toHaveBeenCalledWith('https://api.test/v1/sync/profile', {
    method: 'PUT',
    headers: { authorization: 'Bearer jwt', 'content-type': 'application/json', accept: 'application/json' },
    body: expect.any(String),
  });
  expect(JSON.parse(fetch.mock.calls[0][1].body as string)).toEqual({ profile: expect.objectContaining({ name: 'Alex', updatedAt: stamp }) });
});

test('rules go as one full replacement with tombstones appended, and only after a pull', async () => {
  const fetch = fetchMock(async (_input, init) => (init.method === 'GET' ? respond(200, {}) : respond(200)));
  const adapter = createSyncAdapter(client(fetch));
  const early = await adapter.pushRules([], []).catch((cause: unknown) => cause);
  expect(early).toMatchObject({ kind: 'ordering', retryable: true });
  expect(fetch).not.toHaveBeenCalled();
  await adapter.pull();
  await adapter.pushRules([rule], [{ rule: { ...rule, id: 'gone' }, deletedAt: stamp }]);
  const [url, init] = fetch.mock.calls[1];
  expect(url).toBe(`https://api.test${paths.rules}`);
  const body = JSON.parse(init.body as string);
  expect(Object.keys(body)).toEqual(['rules']);
  expect(body.rules.map((row: { id: string; deletedAt: string | null }) => [row.id, row.deletedAt])).toEqual([
    ['walk', null],
    ['gone', stamp],
  ]);
});

test('a failed pull does not unlock the rules push', async () => {
  const fetch = fetchMock(async () => respond(503));
  const adapter = createSyncAdapter(client(fetch));
  await expect(adapter.pull()).rejects.toMatchObject({ kind: 'server' });
  await expect(adapter.pushRules([], [])).rejects.toMatchObject({ kind: 'ordering' });
});

test('a thousand rule days become three sequential PUTs of at most 400 rows', async () => {
  const fetch = fetchMock(async () => respond(200));
  const rows = Array.from({ length: 1000 }, (_, index) => ({
    ruleId: 'walk',
    day: `2024-${String(1 + (index % 12)).padStart(2, '0')}-${String(1 + (index % 28)).padStart(2, '0')}`,
    progress: index,
    met: false,
    metAt: null,
    updatedAt: stamp,
  }));
  await createSyncAdapter(client(fetch)).pushRuleDays(rows);
  const sizes = fetch.mock.calls.map(([url, init]) => [url, JSON.parse(init.body as string).ruleDays.length]);
  expect(sizes).toEqual([
    [`https://api.test${paths.ruleDays}`, 400],
    [`https://api.test${paths.ruleDays}`, 400],
    [`https://api.test${paths.ruleDays}`, 200],
  ]);
});

test('a failing batch stops the sequence so the remainder is retried later', async () => {
  const fetch = fetchMock(async () => (fetch.mock.calls.length === 2 ? respond(503) : respond(200)));
  const rows = Array.from({ length: 900 }, (_, index) => ({ day: `2025-01-${String(1 + (index % 28)).padStart(2, '0')}`, lockedAppMinutes: index, updatedAt: stamp }));
  await expect(createSyncAdapter(client(fetch)).pushUsageDays(rows)).rejects.toMatchObject({ kind: 'server', status: 503 });
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('status codes map to the retry classes the host acts on', async () => {
  for (const [status, kind] of [
    [401, 'auth'],
    [410, 'auth'],
    [500, 'server'],
    [429, 'server'],
    [408, 'server'],
    [400, 'client'],
    [413, 'client'],
  ] as const) {
    const fetch = fetchMock(async () => respond(status));
    const error = await client(fetch).put(paths.profile, {}).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(SyncError);
    expect(error).toMatchObject({ kind, status });
    expect((error as SyncError).retryable).toBe(kind === 'server');
  }
});

test('a missing session and a thrown fetch are auth and network failures', async () => {
  const noSession = await client(fetchMock(async () => respond(200)), null).get(paths.pull).catch((cause: unknown) => cause);
  expect(noSession).toMatchObject({ kind: 'auth', status: null });
  const offline = await client(
    fetchMock(async () => {
      throw new TypeError('Network request failed');
    }),
  )
    .get(paths.pull)
    .catch((cause: unknown) => cause);
  expect(offline).toMatchObject({ kind: 'network', retryable: true, message: 'Network request failed' });
});

test('pull decodes the server snapshot', async () => {
  const fetch = fetchMock(async () =>
    respond(200, {
      rules: [{ id: 'walk', activity: 'walking', mode: rule.mode, schedule: rule.schedule, enabled: true, createdAt: rule.createdAt, updatedAt: rule.updatedAt, deletedAt: null }],
      ruleDays: [{ ruleId: 'walk', day: '2026-09-06', progress: 5000, met: true, metAt: stamp, updatedAt: stamp }],
      usageDays: [{ day: '2026-09-06', lockedAppMinutes: 30, updatedAt: stamp }],
      earnedUnlocks: [],
      profile: null,
    }),
  );
  const snapshot = await createSyncAdapter(client(fetch)).pull();
  expect(fetch.mock.calls[0][0]).toBe('https://api.test/v1/sync');
  expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'GET' });
  expect(snapshot.rules).toEqual([rule]);
  expect(snapshot.ruleDays).toEqual([{ ruleId: 'walk', day: '2026-09-06', progress: 5000, met: true, metAt: stamp, updatedAt: stamp }]);
  expect(snapshot.usageDays).toEqual([{ day: '2026-09-06', lockedAppMinutes: 30, updatedAt: stamp }]);
});
