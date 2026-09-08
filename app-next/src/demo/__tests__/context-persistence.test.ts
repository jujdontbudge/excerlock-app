import AsyncStorage from '@react-native-async-storage/async-storage';
import { createRuntime } from '../../runtime/createRuntime';
import { rulesStore } from '../../state/rulesStore';
import { historyStore } from '../../state/historyStore';
test('cold runtime restores scenario clock and step signals without resetting edited rules',async()=>{
 await AsyncStorage.clear();const first=createRuntime();await first.dev.load('home-locked-walking');first.dev.advance(3600000);first.dev.setSteps(4100);const now=first.clock.now();rulesStore.getState().patch({rules:rulesStore.getState().data.rules.map(r=>({...r,enabled:false}))});await first.dev.flush();first.dispose();
 const second=createRuntime();await second.dev.ready();expect(second.dev.snapshot().scenarioId).toBe('home-locked-walking');expect(second.clock.now()).toBe(now);expect(await second.steps.stepsSince(now)).toBe(4100);expect(rulesStore.getState().data.rules[0].enabled).toBe(false);second.dispose();
});
test('corrupt fake context is ignored without blocking launch',async()=>{
 await AsyncStorage.setItem('excerlock-next.fake-context.v1','broken');const r=createRuntime();await r.dev.ready();expect(r.dev.snapshot().hydrated).toBe(true);r.dispose();
});
test('cold runtime resumes a saved walking lease without losing verified minutes', async () => {
  await AsyncStorage.clear();
  const first = createRuntime(); await first.dev.load('home-walking-session');
  await first.walking.start(rulesStore.getState().data.rules[0]); first.dev.advance(9000);
  await first.dev.flush(); first.dispose();
  const second = createRuntime(); await second.dev.ready(); second.dev.advance(3000);
  expect(second.walking.details().walkingSeconds).toBe(6);
  second.dispose();
});

test('a plain relaunch preserves persisted history instead of restoring the scenario snapshot', async () => {
  await AsyncStorage.clear();
  const first = createRuntime();
  await first.dev.load('home-unlocked-met');
  expect(historyStore.getState().data.days.length).toBeGreaterThan(0);
  const edited = historyStore.getState().data.days.map((day) =>
    day.day === '2026-09-06' ? { ...day, met: false } : day,
  );
  historyStore.getState().patch({ days: edited });
  await first.dev.flush();
  await Promise.resolve();
  first.dispose();

  const second = createRuntime();
  await second.dev.ready();
  expect(historyStore.getState().data.days.find((day) => day.day === '2026-09-06')?.met).toBe(false);
  second.dispose();
});
