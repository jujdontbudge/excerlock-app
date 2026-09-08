import { accountProvisioning } from '../accountProvisioning';

const API = 'https://api.excerlock.test';

function server(handler: (method: string) => { status: number } | Error) {
  const calls: { method: string; url: string; authorization: string }[] = [];
  const fetcher = (async (url: string, init?: { method?: string; headers?: Record<string, string> }) => {
    const method = init?.method ?? 'GET';
    calls.push({ method, url, authorization: init?.headers?.authorization ?? '' });
    const outcome = handler(method);
    if (outcome instanceof Error) throw outcome;
    return { ok: outcome.status >= 200 && outcome.status < 300, status: outcome.status } as Response;
  }) as unknown as typeof fetch;
  return { calls, account: accountProvisioning({ baseUrl: API, fetcher }) };
}

test('provisioning attaches the token user to the server row', async () => {
  const { account, calls } = server(() => ({ status: 200 }));
  await expect(account.provision('token-1')).resolves.toBe('ok');
  expect(calls).toEqual([{ method: 'PUT', url: `${API}/v1/user`, authorization: 'Bearer token-1' }]);
});

test('a trailing slash on the base url does not double up', async () => {
  const calls: string[] = [];
  const fetcher = (async (url: string) => {
    calls.push(url);
    return { ok: true, status: 200 } as Response;
  }) as unknown as typeof fetch;
  await accountProvisioning({ baseUrl: `${API}/`, fetcher }).provision('token-1');
  expect(calls).toEqual([`${API}/v1/user`]);
});

test('an unreachable server is a failure to retry, not a deletion', async () => {
  const offline = server(() => new Error('Network request failed'));
  await expect(offline.account.provision('token-1')).resolves.toBe('failed');
  const broken = server(() => ({ status: 500 }));
  await expect(broken.account.provision('token-1')).resolves.toBe('failed');
});

test('410 on provisioning means the id is gone for good', async () => {
  const { account } = server(() => ({ status: 410 }));
  await expect(account.provision('token-1')).resolves.toBe('deleted');
});
