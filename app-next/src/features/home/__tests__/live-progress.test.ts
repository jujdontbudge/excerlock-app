import { createRuntime } from '../../../runtime/createRuntime';
import { startProgressSync } from '../progressSync';
import { resolveLock } from '../../../domain/resolveLock';
import { rulesStore } from '../../../state/rulesStore';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
import { permissionsStore } from '../../../state/permissionsStore';
import { gymVisitsStore } from '../../../state/gymVisitsStore';
test('clock enters window, fake steps reach goal and latch unlock; new day starts fresh', async () => {
  const r = createRuntime();
  await r.dev.load('home-before-window');
  const stop = startProgressSync(r);
  const state = () =>
    resolveLock({
      now: r.clock.now(),
      timezone: r.clock.timezone(),
      rules: rulesStore.getState().data.rules,
      ruleDays: ruleDaysStore.getState().data.days,
      earnedUnlocks: ruleDaysStore.getState().data.earnedUnlocks,
      walkingSession: null,
      gymPresence: null,
    }).state;
  expect(state()).toBe('beforeWindow');
  r.dev.advance(3600000);
  expect(state()).toBe('locked');
  r.dev.setSteps(5000);
  expect(state()).toBe('unlockedMet');
  expect(ruleDaysStore.getState().data.earnedUnlocks).toMatchObject([
    { day: '2026-09-07', ruleId: 'walk', metAt: '2026-09-07T13:00:00.000Z' },
  ]);
  r.dev.setSteps(1000);
  expect(state()).toBe('unlockedMet');
  r.dev.advance(86400000);
  expect(state()).toBe('locked');
  expect(ruleDaysStore.getState().data.days.find((d) => d.day === '2026-09-08')?.progress).toBe(0);
  stop();
  r.dispose();
});
test('denied Motion cannot manufacture progress or unlock', async () => {
  const r = createRuntime();
  await r.dev.load('home-locked-walking');
  permissionsStore.getState().patch({ motion: 'denied' });
  const stop = startProgressSync(r);
  r.dev.setSteps(9000);
  expect(ruleDaysStore.getState().data.days[0].met).toBe(false);
  stop();
  r.dispose();
});
test('switching scenarios cannot latch the previous scenario’s steps into the next plan', async () => {
  const r = createRuntime();
  await r.dev.load('home-unlocked-met');
  const stop = startProgressSync(r);
  r.dev.setSteps(9000);
  await r.dev.load('home-locked-walking');
  expect(ruleDaysStore.getState().data.days[0].met).toBe(false);
  stop();
  r.dispose();
});
test('yesterday’s Health workouts never fulfill the next day’s condition', async () => {
  const r = createRuntime();
  await r.dev.load('runner-distance');
  const stop = startProgressSync(r);
  await Promise.resolve();
  await Promise.resolve();
  r.dev.advance(86400000);
  await Promise.resolve();
  await Promise.resolve();
  const today = ruleDaysStore.getState().data.days.find((d) => d.day === '2026-09-08');
  expect(today?.progress).toBe(0);
  expect(today?.met).toBe(false);
  stop();
  r.dispose();
});

test('a gym-minutes condition sees a completed visit without foreground clock ticks', async () => {
  const r = createRuntime();
  await r.dev.load('gym-time-user');
  ruleDaysStore.getState().patch({ days: [] });
  gymVisitsStore.getState().patch({
    visits: [
      {
        id: 'background-visit',
        placeId: r.gym.listPlaces()[0].id,
        enteredAt: '2026-09-07T13:00:00.000Z',
        exitedAt: '2026-09-07T13:35:00.000Z',
        source: 'geofence',
      },
    ],
  });
  const stop = startProgressSync(r);
  await Promise.resolve();
  await Promise.resolve();
  expect(ruleDaysStore.getState().data.days.find((row) => row.ruleId === 'gym')).toMatchObject({
    progress: 35,
    met: true,
  });
  stop();
  r.dispose();
});
