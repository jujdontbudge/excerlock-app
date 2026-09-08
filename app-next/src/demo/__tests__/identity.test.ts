import { createRuntime } from '../../runtime/createRuntime';
import { sessionStore } from '../../state/sessionStore';

test('a fresh anonymous session has a stable user id across rehydration', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const userId = runtime.auth.session().userId;
  expect(userId).toEqual(expect.any(String));
  expect(userId.length).toBeGreaterThan(0);
  await sessionStore.persist.rehydrate();
  expect(runtime.auth.session().userId).toBe(userId);
  runtime.dispose();
});

test('sign-in links the provider to the existing user id and sign-out creates a new anonymous id', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const anonymousId = runtime.auth.session().userId;
  expect((await runtime.auth.signInWithApple()).userId).toBe(anonymousId);
  await runtime.auth.signOut();
  expect(runtime.auth.session()).toMatchObject({ kind: 'anonymous' });
  expect(runtime.auth.session().userId).not.toBe(anonymousId);
  runtime.dispose();
});
