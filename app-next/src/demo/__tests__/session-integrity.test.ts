import { createRuntime } from '../../runtime/createRuntime';
import { rulesStore } from '../../state/rulesStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { todayHistory } from '../../state/todayHistory';
import { startProgressSync } from '../../features/home/progressSync';
test('verified state-walking minutes count toward streak without latching an unlock', async () => {
  const r = createRuntime();
  await r.dev.load('home-walking-session');
  await r.walking.start(rulesStore.getState().data.rules[0]);
  r.dev.advance(6000);
  r.dev.advance(6000);
  const row = ruleDaysStore.getState().data.days[0];
  expect(row.progress).toBeCloseTo(0.1);
  expect(row.met).toBe(false);
  r.dispose();
});
test('ten state-walking minutes make a scheduled day met', async () => {
  const r = createRuntime();
  await r.dev.load('home-walking-session');
  const rule = rulesStore.getState().data.rules[0];
  const rows = [{ ruleId: rule.id, day: '2026-09-07', progress: 10, met: false, metAt: null }];
  expect(todayHistory([], [rule], rows, r.clock.now(), r.clock.timezone())[0].met).toBe(true);
  r.dispose();
});
test('outside check-in cannot satisfy the condition', async () => {
  const r = createRuntime();
  await r.dev.load('gym-arrival-user');
  r.dev.setPresence('outside');
  await expect(r.gym.checkIn(r.gym.listPlaces()[0].id)).rejects.toThrow();
  expect(ruleDaysStore.getState().data.days.some((d) => d.met)).toBe(false);
  r.dispose();
});
test('loading a live walking fixture resumes its script and eventually relocks', async () => {
  const r = createRuntime();
  await r.dev.load('home-walking-session');
  r.dev.advance(12000);
  expect(ruleDaysStore.getState().data.walkingSession?.phase).toBe('grace');
  r.dev.advance(6000);
  expect(ruleDaysStore.getState().data.walkingSession?.phase).toBe('ended');
  r.dispose();
});
test('gym minutes accumulate only while inside and latch at the goal', async () => {
  const r = createRuntime();
  await r.dev.load('gym-time-user');
  const stop = startProgressSync(r);
  await r.gym.checkIn(r.gym.listPlaces()[0].id);
  r.dev.advance(18 * 60000);
  expect(ruleDaysStore.getState().data.days.find((d) => d.ruleId === 'gym')?.met).toBe(true);
  r.dev.setPresence('outside');
  r.dev.advance(60000);
  expect(ruleDaysStore.getState().data.days.find((d) => d.ruleId === 'gym')?.progress).toBe(30);
  stop();
  r.dispose();
});
