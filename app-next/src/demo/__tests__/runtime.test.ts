import { createRuntime } from '../../runtime/createRuntime';
import { permissionsStore } from '../../state/permissionsStore';
import { rulesStore } from '../../state/rulesStore';
import { resolveLock } from '../../domain/resolveLock';
import { ruleDaysStore } from '../../state/ruleDaysStore';
test('scenario loading resets persisted facts, keep-edits preserves them, and ports stay local', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-before-window');
  const decision = () =>
    resolveLock({
      now: runtime.clock.now(),
      timezone: runtime.clock.timezone(),
      rules: rulesStore.getState().data.rules,
      ruleDays: ruleDaysStore.getState().data.days,
      earnedUnlocks: ruleDaysStore.getState().data.earnedUnlocks,
      walkingSession: null,
      gymPresence: null,
    });
  expect(decision().state).toBe('beforeWindow');
  runtime.dev.advance(3600000);
  expect(decision().state).toBe('locked');
  permissionsStore.getState().patch({ motion: 'denied' });
  await runtime.dev.load('home-locked-walking', true);
  expect(permissionsStore.getState().data.motion).toBe('denied');
  await runtime.dev.load('fresh-install');
  runtime.dev.setPromptMode('grant');
  expect(await runtime.steps.request()).toBe('granted');
  expect(await runtime.auth.signInWithApple()).toEqual({
    kind: 'signedIn',
    userId: 'fake-anonymous-user',
    provider: 'apple',
    email: 'alex@example.test',
  });
  expect((await runtime.subscription.presentPaywall('onboarding', 'annual')).status).toBe('trial');
  runtime.analytics.track('condition_created', { activity: 'walking' });
  expect(runtime.dev.snapshot().events.at(-1)?.event).toBe('condition_created');
  runtime.dispose();
});
