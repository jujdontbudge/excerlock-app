import { createRuntime } from '../createRuntime';
import { bindIdentity } from '../IdentityBridge';
import { identityOf, sameIdentity } from '../../domain/identity';
import { sessionStore } from '../../state/sessionStore';

test('an anonymous session leaves both ports unidentified', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const subscription = jest.spyOn(runtime.subscription, 'identify');
  const analytics = jest.spyOn(runtime.analytics, 'identify');

  const stop = bindIdentity(runtime);

  expect(subscription).not.toHaveBeenCalled();
  expect(analytics).not.toHaveBeenCalled();
  stop();
  runtime.dispose();
});

test('signing in identifies the subscription port before analytics', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const order: string[] = [];
  jest.spyOn(runtime.subscription, 'identify').mockImplementation((id) => void order.push(`subscription:${id}`));
  jest.spyOn(runtime.analytics, 'identify').mockImplementation((id) => void order.push(`analytics:${id}`));
  const stop = bindIdentity(runtime);

  runtime.dev.setSession({ kind: 'signedIn', provider: 'apple', email: 'alex@example.test' });

  const id = identityOf(sessionStore.getState().data.session).userId;
  expect(order).toEqual([`subscription:${id}`, `analytics:${id}`]);
  stop();
  runtime.dispose();
});

test('signing out resets analytics before the subscription', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('signed-in-apple');
  const order: string[] = [];
  jest.spyOn(runtime.analytics, 'reset').mockImplementation(() => void order.push('analytics'));
  jest.spyOn(runtime.subscription, 'reset').mockImplementation(() => void order.push('subscription'));
  const stop = bindIdentity(runtime);

  runtime.dev.setSession({ kind: 'anonymous' });

  expect(order).toEqual(['analytics', 'subscription']);
  stop();
  runtime.dispose();
});

test('an unchanged session does not re-identify', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('signed-in-apple');
  const analytics = jest.spyOn(runtime.analytics, 'identify');
  const stop = bindIdentity(runtime);
  expect(analytics).toHaveBeenCalledTimes(1);

  sessionStore.getState().patch({ session: { ...sessionStore.getState().data.session } });

  expect(analytics).toHaveBeenCalledTimes(1);
  stop();
  runtime.dispose();
});

test('unbinding stops the bridge from following later sessions', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const analytics = jest.spyOn(runtime.analytics, 'identify');
  bindIdentity(runtime)();

  runtime.dev.setSession({ kind: 'signedIn', provider: 'google', email: 'sam@example.test' });

  expect(analytics).not.toHaveBeenCalled();
  runtime.dispose();
});

test('identityOf reads one stable id per signed-in session and none when anonymous', () => {
  const session = { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' } as const;
  expect(identityOf({ kind: 'anonymous' })).toEqual({ userId: null });
  expect(identityOf(session).userId).toBe(identityOf({ ...session }).userId);
  expect(sameIdentity({ kind: 'anonymous' }, { kind: 'anonymous' })).toBe(true);
  expect(sameIdentity({ kind: 'anonymous' }, session)).toBe(false);
});
