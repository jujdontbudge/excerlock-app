import { createApiClient, createVpsProvisioning } from '..';
import { ApiFetch } from '../client';

function provisioningWith(status: number, calls: { method: string; auth: string }[] = []) {
  const fetch: ApiFetch = async (_url, init) => {
    calls.push({ method: init.method, auth: init.headers.Authorization });
    return { status, text: async () => (status >= 400 ? '{"error":{"code":"ACCOUNT_DELETION_UNAVAILABLE"}}' : '') };
  };
  return createVpsProvisioning(
    createApiClient({
      baseUrl: 'https://a',
      getAccessToken: async () => {
        throw new Error('the adapter supplies its own token');
      },
      fetch,
    }),
  );
}

test('provision is PUT /v1/user with the adapter token and never throws', async () => {
  const calls: { method: string; auth: string }[] = [];
  expect(await provisioningWith(204, calls).provision('jwt')).toBe('ok');
  expect(calls).toEqual([{ method: 'PUT', auth: 'Bearer jwt' }]);
  expect(await provisioningWith(410).provision('jwt')).toBe('deleted');
  expect(await provisioningWith(503).provision('jwt')).toBe('failed');
});

test('remove is DELETE /v1/user, already-deleted is not a failure, and a refusal throws a typed error', async () => {
  const calls: { method: string; auth: string }[] = [];
  expect(await provisioningWith(204, calls).remove('jwt')).toBe('ok');
  expect(calls).toEqual([{ method: 'DELETE', auth: 'Bearer jwt' }]);
  expect(await provisioningWith(410).remove('jwt')).toBe('deleted');
  expect(await provisioningWith(404).remove('jwt')).toBe('deleted');
  await expect(provisioningWith(503).remove('jwt')).rejects.toMatchObject({
    kind: 'unavailable',
    code: 'ACCOUNT_DELETION_UNAVAILABLE',
  });
});
