import { createRuntime } from '../../../runtime/createRuntime';
import { startWalkingSync } from '../walkingSync';
import { resolveLock } from '../../../domain/resolveLock';
import { rulesStore } from '../../../state/rulesStore';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
import { permissionsStore } from '../../../state/permissionsStore';
import { settingsStore } from '../../../state/settingsStore';
import { WALK_VERIFY_MS } from '../../../domain/walking';
const flush = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};
const state = (r: ReturnType<typeof createRuntime>) =>
  resolveLock({
    now: r.clock.now(),
    timezone: r.clock.timezone(),
    rules: rulesStore.getState().data.rules,
    ruleDays: ruleDaysStore.getState().data.days,
    walkingSession: ruleDaysStore.getState().data.walkingSession,
  }).state;
const phase = () => ruleDaysStore.getState().data.walkingSession?.phase;
test('walking is detected on its own, unlocks after a sustained cadence, pauses in grace and relocks when it stops', async () => {
  const r = createRuntime();
  await r.dev.load('walk-state-ready');
  const stop = startWalkingSync(r);
  await flush();
  expect(phase()).toBeUndefined();
  expect(state(r)).toBe('locked');
  r.dev.setMotion('walking');
  await flush();
  expect(phase()).toBe('verifying');
  r.dev.advance(WALK_VERIFY_MS - 1000);
  expect(phase()).toBe('verifying');
  expect(state(r)).toBe('locked');
  r.dev.advance(1000);
  expect(phase()).toBe('walking');
  expect(state(r)).toBe('unlockedWalking');
  r.dev.advance(120000);
  expect(r.walking.details().walkingSeconds).toBe(120);
  expect(ruleDaysStore.getState().data.days[0].progress).toBeCloseTo(2);
  r.dev.setMotion('still');
  expect(phase()).toBe('grace');
  expect(state(r)).toBe('unlockedWalking');
  r.dev.advance(settingsStore.getState().data.stopGrace * 1000 - 1000);
  r.dev.setMotion('walking');
  expect(phase()).toBe('walking');
  r.dev.setMotion('still');
  r.dev.advance(settingsStore.getState().data.stopGrace * 1000);
  expect(phase()).toBe('ended');
  expect(state(r)).toBe('locked');
  expect(r.walking.details().walkingSeconds).toBe(120);
  stop();
  r.dispose();
});
test('a brief shuffle never verifies, and a walk the user stopped is not restarted until walking begins again', async () => {
  const r = createRuntime();
  await r.dev.load('walk-state-ready');
  const stop = startWalkingSync(r);
  r.dev.setMotion('walking');
  await flush();
  r.dev.advance(4000);
  r.dev.setMotion('still');
  r.dev.advance(4000);
  r.dev.setMotion('walking');
  r.dev.advance(8000);
  expect(phase()).toBe('verifying');
  r.dev.advance(2000);
  expect(phase()).toBe('walking');
  r.walking.stop();
  await flush();
  expect(phase()).toBe('ended');
  r.dev.advance(5000);
  await flush();
  expect(phase()).toBe('ended');
  r.dev.setMotion('still');
  r.dev.setMotion('walking');
  await flush();
  expect(phase()).toBe('verifying');
  stop();
  r.dispose();
});
test('the manual route verifies from the same signal and denied Motion blocks automatic starts', async () => {
  const r = createRuntime();
  await r.dev.load('walk-state-ready');
  await r.walking.start(rulesStore.getState().data.rules[0]);
  r.dev.advance(60000);
  expect(phase()).toBe('verifying');
  r.dev.setMotion('walking');
  r.dev.advance(WALK_VERIFY_MS);
  expect(phase()).toBe('walking');
  r.walking.stop();
  ruleDaysStore.getState().patch({ walkingSession: null });
  permissionsStore.getState().patch({ motion: 'denied' });
  const stop = startWalkingSync(r);
  r.dev.setMotion('still');
  r.dev.setMotion('walking');
  await flush();
  expect(phase()).toBeUndefined();
  stop();
  r.dispose();
});
