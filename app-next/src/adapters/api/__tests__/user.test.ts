import { createApiClient, createUserApi, withServerDeletion } from '..';
import { ApiFetch } from '../client';
import { AuthPort } from '../../../ports/AuthPort';
import { Session } from '../../../domain/types';

function apiWith(status: number, calls: string[] = []) {
  const fetch: ApiFetch = async (url, init) => {
    calls.push(`${init.method} ${url}`);
    return { status, text: async () => (status >= 400 ? '{"error":{"code":"ACCOUNT_DELETION_FAILED"}}' : '') };
  };
  return createUserApi(createApiClient({ baseUrl: 'https://a', getAccessToken: async () => 't', fetch }));
}

function authStub(calls: string[]): AuthPort {
  let session: Session = { kind: 'signedIn', userId: 'u1', provider: 'apple', email: null };
  const listeners = new Set<(s: Session) => void>();
  return {
    session: () => session,
    signInWithApple: async () => session,
    signInWithGoogle: async () => session,
    sendEmailCode: async () => {},
    verifyEmailCode: async () => session,
    signOut: async () => {},
    deleteAccount: async () => {
      calls.push('auth.deleteAccount');
      session = { kind: 'anonymous', userId: 'anon-2' };
      listeners.forEach((l) => l(session));
    },
    subscribe: (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}

test('DELETE /v1/user resolves on 204 and on an already-deleted account', async () => {
  const calls: string[] = [];
  await apiWith(204, calls).deleteUser();
  expect(calls).toEqual(['DELETE https://a/v1/user']);
  await expect(apiWith(410).deleteUser()).resolves.toBeUndefined();
  await expect(apiWith(404).deleteUser()).resolves.toBeUndefined();
});

test('a failed server deletion surfaces as a retryable error', async () => {
  await expect(apiWith(500).deleteUser()).rejects.toMatchObject({ kind: 'unavailable', code: 'ACCOUNT_DELETION_FAILED' });
  await expect(apiWith(502).deleteUser()).rejects.toMatchObject({ kind: 'unavailable' });
});

test('withServerDeletion deletes on the server first, then tears the local session down', async () => {
  const calls: string[] = [];
  const auth = withServerDeletion(authStub(calls), apiWith(204, calls));
  const seen: Session['kind'][] = [];
  auth.subscribe((s) => seen.push(s.kind));
  await auth.deleteAccount();
  expect(calls).toEqual(['DELETE https://a/v1/user', 'auth.deleteAccount']);
  expect(auth.session().kind).toBe('anonymous');
  expect(seen).toEqual(['anonymous']);
});

test('when the server refuses, nothing local changes and the user can retry', async () => {
  const calls: string[] = [];
  const auth = withServerDeletion(authStub(calls), apiWith(503, calls));
  await expect(auth.deleteAccount()).rejects.toMatchObject({ kind: 'unavailable' });
  expect(calls).toEqual(['DELETE https://a/v1/user']);
  expect(auth.session().kind).toBe('signedIn');
});
