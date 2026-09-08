import { createApiClient, createUserApi } from '..';
import { ApiFetch } from '../client';

function apiWith(status: number, calls: { url: string; method: string; auth: string }[] = []) {
  const fetch: ApiFetch = async (url, init) => {
    calls.push({ url, method: init.method, auth: init.headers.Authorization });
    return { status, text: async () => (status >= 400 ? '{"error":{"code":"ACCOUNT_DELETION_FAILED"}}' : '') };
  };
  return createUserApi(createApiClient({ baseUrl: 'https://a', getAccessToken: async () => 'session-token', fetch }));
}

test('DELETE /v1/user is ok on 204 and deleted on a tombstoned or missing account', async () => {
  const calls: { url: string; method: string; auth: string }[] = [];
  expect(await apiWith(204, calls).deleteUser()).toBe('ok');
  expect(calls).toEqual([{ url: 'https://a/v1/user', method: 'DELETE', auth: 'Bearer session-token' }]);
  expect(await apiWith(410).deleteUser()).toBe('deleted');
  expect(await apiWith(404).deleteUser()).toBe('deleted');
});

test('a failed server deletion surfaces as a retryable error', async () => {
  await expect(apiWith(500).deleteUser()).rejects.toMatchObject({
    kind: 'unavailable',
    code: 'ACCOUNT_DELETION_FAILED',
  });
  await expect(apiWith(502).deleteUser()).rejects.toMatchObject({ kind: 'unavailable' });
  await expect(apiWith(503).deleteUser()).rejects.toMatchObject({ kind: 'unavailable' });
});

test('PUT /v1/user provisions idempotently and never throws', async () => {
  const calls: { url: string; method: string; auth: string }[] = [];
  expect(await apiWith(204, calls).putUser()).toBe('ok');
  expect(calls).toEqual([{ url: 'https://a/v1/user', method: 'PUT', auth: 'Bearer session-token' }]);
  expect(await apiWith(410).putUser()).toBe('deleted');
  expect(await apiWith(503).putUser()).toBe('failed');
  const offline = createUserApi(
    createApiClient({
      baseUrl: 'https://a',
      getAccessToken: async () => 't',
      fetch: async () => {
        throw new TypeError('Network request failed');
      },
    }),
  );
  expect(await offline.putUser()).toBe('failed');
});

test('a token the auth adapter already holds is sent as-is without a second lookup', async () => {
  const calls: { url: string; method: string; auth: string }[] = [];
  const lookups: number[] = [];
  const fetch: ApiFetch = async (url, init) => {
    calls.push({ url, method: init.method, auth: init.headers.Authorization });
    return { status: 204, text: async () => '' };
  };
  const api = createUserApi(
    createApiClient({
      baseUrl: 'https://a',
      getAccessToken: async () => {
        lookups.push(1);
        return 'session-token';
      },
      fetch,
    }),
  );
  expect(await api.putUser('adapter-token')).toBe('ok');
  expect(await api.deleteUser('adapter-token')).toBe('ok');
  expect(calls.map((c) => c.auth)).toEqual(['Bearer adapter-token', 'Bearer adapter-token']);
  expect(lookups).toEqual([]);
});
