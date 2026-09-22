import { pathFor } from '../../../onboarding/flow';
import { canContinue } from '../../../onboarding/validation';
import { onboardingStore } from '../../../state/onboardingStore';
import { weeklyTargets } from '../weeklyTargets';

test('gym asks frequency and session length before condition setup', () => {
  const path = pathFor({ activity: 'gym' });
  expect(path.slice(path.indexOf('O20') + 1, path.indexOf('G1'))).toEqual(['G0F', 'G0H']);
  expect(canContinue('G0F', {})).toBe(false);
  expect(canContinue('G0F', { gymSessionsPerWeek: 3 })).toBe(true);
  expect(canContinue('G0H', { gymSessionHours: 1 })).toBe(true);
});
test('baseline answers and route survive persisted-store validation', () => {
  onboardingStore.getState().patch({ step: 'W0', answers: { currentDailySteps: 20000 } });
  expect(onboardingStore.getState().data.step).toBe('W0');
  expect(onboardingStore.getState().data.answers.currentDailySteps).toBe(20000);
  onboardingStore.getState().patch({ step: 'G0H', answers: { gymSessionsPerWeek: 3, gymSessionHours: 1.5 } });
  expect(onboardingStore.getState().data.step).toBe('G0H');
  expect(onboardingStore.getState().data.answers.gymSessionHours).toBe(1.5);
});
test('weekly suggestions use the selected baseline without inventing a forecast', () => {
  expect(weeklyTargets({ activity: 'walking', currentDailySteps: 7500 }).movement?.baseline).toBe('From your 5,000–10,000 steps per day baseline');
  expect(weeklyTargets({ activity: 'gym', gymSessionsPerWeek: 2, gymSessionHours: 1.5 }).movement?.baseline).toBe('3 → 4.5 hours per week');
  expect(weeklyTargets({ activity: 'gym' }).movement).toBeNull();
});
test('walking asks current daily steps before condition setup', () => {
  const path = pathFor({ activity: 'walking' });
  expect(path[path.indexOf('O20') + 1]).toBe('W0');
  expect(canContinue('W0', {})).toBe(false);
  expect(canContinue('W0', { currentDailySteps: 7500 })).toBe(true);
});
