import { createRuntime } from '../../../runtime/createRuntime';
import { startGymPresenceSync } from '../gymPresenceSync';
import { resolveLock } from '../../../domain/resolveLock';
import { rulesStore } from '../../../state/rulesStore';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
import { permissionsStore } from '../../../state/permissionsStore';
import { PRESENCE_CONFIRM_MS, PRESENCE_EXIT_GRACE_MS } from '../../../domain/presence';
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
const state = (r: ReturnType<typeof createRuntime>) =>
  resolveLock({
    now: r.clock.now(),
    timezone: r.clock.timezone(),
    rules: rulesStore.getState().data.rules,
    ruleDays: ruleDaysStore.getState().data.days,
    walkingSession: null,
    gymPresence: ruleDaysStore.getState().data.gymPresence,
  }).state;
const progress = () => ruleDaysStore.getState().data.days.find((d) => d.ruleId === 'gym')?.progress;
const session = () => ruleDaysStore.getState().data.gymPresence;
const flush = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};
/** Real timers drive the 30-second confirmation; the fake clock drives minutes and the exit grace. */
const settle = async (r: ReturnType<typeof createRuntime>, ms: number) => {
  jest.advanceTimersByTime(ms);
  r.dev.advance(ms);
  await flush();
};
test('being inside the gym confirms on its own, unlocks, counts minutes, pauses and relocks after leaving', async () => {
  const r = createRuntime();
  await r.dev.load('gym-time-user');
  const stop = startGymPresenceSync(r);
  await flush();
  expect(session()).toMatchObject({ placeId: r.gym.listPlaces()[0].id, confirmedAt: null });
  expect(state(r)).toBe('locked');
  await settle(r, PRESENCE_CONFIRM_MS - 1000);
  expect(session()?.confirmedAt).toBeNull();
  await settle(r, 1000);
  expect(session()?.confirmedAt).toBeTruthy();
  expect(state(r)).toBe('unlockedAtGym');
  r.dev.advance(5 * 60000);
  expect(progress()).toBe(17);
  r.dev.setPresence('outside');
  r.dev.advance(60000 - 1000);
  expect(progress()).toBe(17);
  expect(state(r)).toBe('unlockedAtGym');
  r.dev.setPresence('inside');
  r.dev.advance(2 * 60000);
  expect(progress()).toBe(19);
  expect(session()?.confirmedAt).toBeTruthy();
  r.dev.setPresence('outside');
  r.dev.advance(PRESENCE_EXIT_GRACE_MS);
  expect(session()).toBeNull();
  expect(state(r)).toBe('locked');
  expect(progress()).toBe(19);
  stop();
  r.dispose();
});
test('a walk past the gym never confirms; a real arrival marks an arrival condition met', async () => {
  const r = createRuntime();
  await r.dev.load('gym-arrival-user');
  const stop = startGymPresenceSync(r);
  await flush();
  expect(session()).toBeNull();
  r.dev.setPresence('inside');
  await flush();
  expect(session()?.confirmedAt).toBeNull();
  await settle(r, 10000);
  r.dev.setPresence('outside');
  await flush();
  expect(session()).toBeNull();
  expect(state(r)).toBe('locked');
  r.dev.setPresence('inside');
  await flush();
  await settle(r, PRESENCE_CONFIRM_MS);
  expect(ruleDaysStore.getState().data.days.find((d) => d.ruleId === 'gym')?.met).toBe(true);
  expect(state(r)).toBe('unlockedMet');
  stop();
  r.dispose();
});
test('without location access nothing confirms automatically', async () => {
  const r = createRuntime();
  await r.dev.load('gym-time-user');
  permissionsStore.getState().patch({ location: 'denied' });
  const stop = startGymPresenceSync(r);
  await settle(r, PRESENCE_CONFIRM_MS * 2);
  expect(session()).toBeNull();
  expect(progress()).toBe(12);
  stop();
  r.dispose();
});
test('a stale confirmed visit does not survive a scenario reload', async () => {
  const r = createRuntime();
  await r.dev.load('gym-time-user');
  const stop = startGymPresenceSync(r);
  await settle(r, PRESENCE_CONFIRM_MS);
  expect(session()?.confirmedAt).toBeTruthy();
  await r.dev.load('gym-arrival-user');
  expect(session()).toBeNull();
  stop();
  r.dispose();
});
