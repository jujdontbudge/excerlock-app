import { resolveLock } from '../../domain/resolveLock';
import { createRuntime } from '../../runtime/createRuntime';
import { dayKey } from '../../domain/calendar';
import { rulesStore } from '../../state/rulesStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { startProgressSync } from '../../features/home/progressSync';
import { historyStore } from '../../state/historyStore';

test('today Analytics uses the same live steps and workout minutes as the fake ports', async () => {
  const r = createRuntime();
  await r.dev.load('runner-distance');
  let stopProgress = startProgressSync(r);
  const today = () => historyStore.getState().data.days.find((d) => d.day === dayKey(r.clock.now(), r.clock.timezone()))!;
  expect(today().activity.walking).toBe(await r.steps.stepsSince(r.clock.now()));
  expect(today().activity.running).toBe(14);
  expect(today().usageMinutes).toBe(42);
  const past = historyStore.getState().data.days.filter((d) => d.day !== today().day);
  r.dev.setSteps(5400);
  expect(today().activity.walking).toBe(5400);
  expect(historyStore.getState().data.days.filter((d) => d.day !== today().day)).toEqual(past);
  stopProgress();
  await r.dev.load('gym-time-user');
  stopProgress = startProgressSync(r);
  await r.gym.checkIn(r.gym.listPlaces()[0].id);
  r.dev.advance(18 * 60000);
  expect(today().activity.gym).toBe(30);
  stopProgress();
  await r.dev.load('home-walking-session');
  const rule = rulesStore.getState().data.rules[0];
  ruleDaysStore
    .getState()
    .patch({ days: [{ ruleId: rule.id, day: today().day, progress: 10, met: false, metAt: null }] });
  expect(today().activity.walking).toBe(await r.steps.stepsSince(r.clock.now()));
  r.dispose();
});
test('the local gym search can exercise the five-gym limit with fixed 100m places', async () => {
  const r = createRuntime();
  await r.dev.load('home-locked-walking');
  const places = await r.gym.searchPlaces('');
  expect(places.length).toBeGreaterThanOrEqual(6);
  expect(places.every((p) => p.radiusMeters === 100)).toBe(true);
  for (const p of places.slice(0, 5)) await r.gym.savePlace(p);
  await expect(r.gym.savePlace(places[5])).rejects.toThrow('GYM_LIMIT_REACHED');
  expect(r.gym.listPlaces()).toHaveLength(5);
  r.dispose();
});
test('fake usage, steps and workouts do not leak into a different calendar day', async () => {
  const r = createRuntime();
  await r.dev.load('runner-distance');
  r.dev.advance(24 * 60 * 60000);
  let usage: number | null = 0;
  const stop = r.screenTime.observeUsage((value) => {
    usage = value;
  });
  expect(usage).toBeNull();
  expect(await r.steps.stepsSince(r.clock.now())).toBe(0);
  expect(await r.health.workoutsToday('running')).toEqual([]);
  stop();
  r.dispose();
});
test.each(['gym-arrival-user', 'gym-time-user'])(
  '%s credits the active overnight window, including after midnight',
  async (id) => {
    const r = createRuntime();
    await r.dev.load(id);
    const stopProgress = startProgressSync(r);
    rulesStore
      .getState()
      .patch({
        rules: rulesStore
          .getState()
          .data.rules.map((rule) => ({
            ...rule,
            schedule: {
              days: [0, 1, 2, 3, 4, 5, 6],
              window: { kind: 'range' as const, startMinute: 1200, endMinute: 120 },
            },
          })),
      });
    r.dev.setTime('2026-09-08T05:00:00.000Z', 'America/New_York');
    r.dev.setPresence('inside');
    await r.gym.checkIn(r.gym.listPlaces()[0].id);
    if (id === 'gym-time-user') r.dev.advance(18 * 60000);
    else r.dev.advance(30_000);
    expect(ruleDaysStore.getState().data.days.find((d) => d.ruleId === 'gym' && d.day === '2026-09-07')?.met).toBe(
      true,
    );
    expect(
      resolveLock({
        now: r.clock.now(),
        timezone: r.clock.timezone(),
        rules: rulesStore.getState().data.rules,
        ruleDays: ruleDaysStore.getState().data.days,
        walkingSession: null,
      }).state,
    ).toBe('unlockedMet');
    if (id === 'gym-time-user')
      expect(historyStore.getState().data.days.find((d) => d.day === '2026-09-08')?.activity.gym).toBe(18);
    stopProgress();
    r.dispose();
  },
);
