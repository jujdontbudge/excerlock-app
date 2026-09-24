import { pathFor } from '../../../onboarding/flow';
import { canContinue } from '../../../onboarding/validation';
import { onboardingStore } from '../../../state/onboardingStore';
import { planGoals } from '../planGoals';

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
test('plan goals follow the chosen activity and body goal, always halving screen time', () => {
  const text = (answers: Parameters<typeof planGoals>[0]) => planGoals(answers).map((goal) => goal.text);
  expect(text({ activity: 'walking', bodyGoal: 'lose' })).toEqual(['150% more steps', 'Lose body fat', '50% less screen time']);
  expect(text({ activity: 'gym', bodyGoal: 'gain' })).toEqual(['150% more time at the gym', 'Build muscle', '50% less screen time']);
  expect(text({ activity: 'gym' })).toEqual(['150% more time at the gym', '50% less screen time']);
});
test('walking asks current daily steps before condition setup', () => {
  const path = pathFor({ activity: 'walking' });
  expect(path[path.indexOf('O20') + 1]).toBe('W0');
  expect(canContinue('W0', {})).toBe(false);
  expect(canContinue('W0', { currentDailySteps: 7500 })).toBe(true);
});
