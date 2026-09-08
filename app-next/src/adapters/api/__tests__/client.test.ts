import { ApiError, createApiClient, errorCode, failureFor } from '..';
import { ApiFetch } from '../client';

type Call = Parameters<ApiFetch>;
function fetchStub(status: number, text = '', calls: Call[] = []): ApiFetch {
  return async (...call) => {
    calls.push(call);
    return { status, text: async () => text };
  };
}

test('every request carries the bearer token, the JSON body and a strict base URL', async () => {
  const calls: Call[] = [];
  const client = createApiClient({
    baseUrl: 'https://api.example.test/',
    getAccessToken: async () => 'token-1',
    fetch: fetchStub(201, '{"submissionId":"s1"}', calls),
  });
  const response = await client.request('/v1/support', { method: 'POST', body: { a: 1 } });
  expect(response).toEqual({ status: 201, body: { submissionId: 's1' } });
  expect(calls[0][0]).toBe('https://api.example.test/v1/support');
  expect(calls[0][1]).toMatchObject({
    method: 'POST',
    body: '{"a":1}',
    headers: { Authorization: 'Bearer token-1', 'Content-Type': 'application/json', Accept: 'application/json' },
  });
});

test('a body-less request sends no content type and tolerates an empty or invalid response body', async () => {
  const calls: Call[] = [];
  const client = createApiClient({
    baseUrl: 'https://a',
    getAccessToken: async () => 't',
    fetch: fetchStub(204, '', calls),
  });
  expect(await client.request('/v1/user', { method: 'DELETE' })).toEqual({ status: 204, body: null });
  expect(calls[0][1].headers['Content-Type']).toBeUndefined();
  expect('body' in calls[0][1]).toBe(false);
  const broken = createApiClient({
    baseUrl: 'https://a',
    getAccessToken: async () => 't',
    fetch: fetchStub(500, 'not json'),
  });
  expect(await broken.request('/v1/user', { method: 'DELETE' })).toEqual({ status: 500, body: null });
});

test('no access token fails as unauthenticated before anything is sent', async () => {
  const calls: Call[] = [];
  const client = createApiClient({
    baseUrl: 'https://a',
    getAccessToken: async () => null,
    fetch: fetchStub(200, '', calls),
  });
  await expect(client.request('/v1/user', { method: 'GET' })).rejects.toMatchObject({ kind: 'unauthenticated' });
  expect(calls).toHaveLength(0);
});

test('a network failure is offline and a slow server is a timeout that aborts the request', async () => {
  const offline = createApiClient({
    baseUrl: 'https://a',
    getAccessToken: async () => 't',
    fetch: async () => {
      throw new TypeError('Network request failed');
    },
  });
  await expect(offline.request('/v1/user', { method: 'GET' })).rejects.toMatchObject({ kind: 'offline' });

  let aborted = false;
  const slow = createApiClient({
    baseUrl: 'https://a',
    getAccessToken: async () => 't',
    timeoutMs: 5,
    fetch: (_url, init) =>
      new Promise((_, reject) =>
        init.signal.addEventListener('abort', () => (aborted = true) && reject(new Error('aborted'))),
      ),
  });
  await expect(slow.request('/v1/user', { method: 'GET' })).rejects.toMatchObject({ kind: 'timeout' });
  expect(aborted).toBe(true);
});

test('a slow token lookup and a slow body read are timeouts too', async () => {
  const slowToken = createApiClient({
    baseUrl: 'https://a',
    getAccessToken: () => new Promise(() => {}),
    timeoutMs: 5,
    fetch: fetchStub(200),
  });
  await expect(slowToken.request('/v1/user', { method: 'GET' })).rejects.toMatchObject({ kind: 'timeout' });
  const slowBody = createApiClient({
    baseUrl: 'https://a',
    getAccessToken: async () => 't',
    timeoutMs: 5,
    fetch: async () => ({ status: 200, text: () => new Promise<string>(() => {}) }),
  });
  await expect(slowBody.request('/v1/user', { method: 'GET' })).rejects.toMatchObject({ kind: 'timeout' });
});

test('failureFor maps statuses to the kinds screens branch on and keeps the server code', () => {
  expect(failureFor({ status: 401, body: null })).toMatchObject({ kind: 'unauthenticated', status: 401 });
  expect(failureFor({ status: 400, body: { error: { code: 'INVALID_SUPPORT_REQUEST' } } })).toMatchObject({
    kind: 'rejected',
    status: 400,
    code: 'INVALID_SUPPORT_REQUEST',
  });
  expect(failureFor({ status: 503, body: { error: { code: 'ACCOUNT_DELETION_UNAVAILABLE' } } })).toMatchObject({
    kind: 'unavailable',
    code: 'ACCOUNT_DELETION_UNAVAILABLE',
  });
  expect(errorCode({ error: 'x' })).toBeNull();
  expect(errorCode({ error: { code: 1 } })).toBeNull();
  expect(errorCode('nope')).toBeNull();
  expect(new ApiError('offline').message).toBe('API offline');
  expect(new ApiError('rejected', 400).message).toBe('API rejected (400)');
});
