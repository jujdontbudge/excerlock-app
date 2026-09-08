import { createRuntime } from '../../runtime/createRuntime';
import { resumeAfterSignIn } from '../resumeAfterSignIn';

test('resume identifies both SDKs before restoring and returns entitled access', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const session = await runtime.auth.signInWithApple();
  runtime.dev.setRestoreOutcome('restored');
  expect(await resumeAfterSignIn(runtime, session)).toBe('entitled');
  expect(runtime.dev.snapshot().events.slice(-3).map(({ event }) => event)).toEqual([
    'subscription_identify',
    'identify',
    'restore',
  ]);
  runtime.dispose();
});

test('resume reports no subscription without changing the signed-in session', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const session = await runtime.auth.signInWithApple();
  runtime.dev.setRestoreOutcome('notFound');
  expect(await resumeAfterSignIn(runtime, session)).toBe('noSubscription');
  expect(runtime.auth.session()).toBe(session);
  runtime.dispose();
});

test('resume reports restore errors without changing the signed-in session', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const session = await runtime.auth.signInWithApple();
  runtime.dev.setOutcome('error');
  expect(await resumeAfterSignIn(runtime, session)).toBe('error');
  expect(runtime.auth.session()).toBe(session);
  runtime.dispose();
});
