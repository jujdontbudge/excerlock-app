import { createRuntime } from '../createRuntime';
import { startIdentityBridge } from '../IdentityBridge';
import { sessionStore } from '../../state/sessionStore';

test('the anonymous id at first launch identifies the subscription port before analytics', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const order: string[] = [];
  jest.spyOn(runtime.subscription, 'identify').mockImplementation((id) => void order.push(`subscription:${id}`));
  jest.spyOn(runtime.analytics, 'identify').mockImplementation((id) => void order.push(`analytics:${id}`));

  const stop = startIdentityBridge(runtime);

  const { userId } = sessionStore.getState().data.session;
  expect(order).toEqual([`subscription:${userId}`, `analytics:${userId}`]);
  stop();
  runtime.dispose();
});

test('signing in identifies the subscription port before analytics', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const order: string[] = [];
  const stop = startIdentityBridge(runtime);
  jest.spyOn(runtime.subscription, 'identify').mockImplementation((id) => void order.push(`subscription:${id}`));
  jest.spyOn(runtime.analytics, 'identify').mockImplementation((id) => void order.push(`analytics:${id}`));

  runtime.dev.setSession({
    kind: 'signedIn',
    userId: 'signed-in-user',
    provider: 'apple',
    email: 'alex@example.test',
  });

  expect(order).toEqual(['subscription:signed-in-user', 'analytics:signed-in-user']);
  stop();
  runtime.dispose();
});

test('signing out re-binds the anonymous id in the same order', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('signed-in-apple');
  const order: string[] = [];
  const stop = startIdentityBridge(runtime);
  jest.spyOn(runtime.subscription, 'identify').mockImplementation((id) => void order.push(`subscription:${id}`));
  jest.spyOn(runtime.analytics, 'identify').mockImplementation((id) => void order.push(`analytics:${id}`));

  runtime.dev.setSession({ kind: 'anonymous', userId: 'local-anonymous-user' });

  expect(order).toEqual(['subscription:local-anonymous-user', 'analytics:local-anonymous-user']);
  stop();
  runtime.dispose();
});

test('an unchanged session does not re-identify', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('signed-in-apple');
  const analytics = jest.spyOn(runtime.analytics, 'identify');
  const stop = startIdentityBridge(runtime);
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
  startIdentityBridge(runtime)();
  analytics.mockClear();

  runtime.dev.setSession({ kind: 'signedIn', userId: 'sam', provider: 'google', email: 'sam@example.test' });

  expect(analytics).not.toHaveBeenCalled();
  runtime.dispose();
});
