import { canContinue } from '../validation';

test('20 steps is the explicit reviewer goal without lowering the ordinary floor', () => {
  expect(canContinue('W3', { walkingMode: 'steps', stepGoal: 20 })).toBe(true);
  expect(canContinue('W3', { walkingMode: 'steps', stepGoal: 21 })).toBe(false);
  expect(canContinue('W3', { walkingMode: 'steps', stepGoal: 499 })).toBe(false);
  expect(canContinue('W3', { walkingMode: 'steps', stepGoal: 500 })).toBe(true);
});
test('pre-branch forms require their answer while numeric scrolling starts with an editable default', () => {
  expect(canContinue('O04', {})).toBe(false);
  expect(canContinue('O04', { name: '  ' })).toBe(false);
  expect(canContinue('O04', { name: 'Alex' })).toBe(true);
  expect(canContinue('O04', { name: 'a'.repeat(31) })).toBe(false);
  for (const [step, key, value] of [
    ['O05', 'referralSource', 'friend'],
    ['O06', 'ageBand', '25–34'],
    ['O08', 'improveFirst', 'exercise'],
    ['O09', 'weeklyExerciseHours', '1-2'],
    ['O20', 'activity', 'walking'],
  ]) {
    expect(canContinue(step, {})).toBe(false);
    expect(canContinue(step, { [key]: value })).toBe(true);
  }
  expect(canContinue('O10', {})).toBe(true);
  expect(canContinue('O10', { estimatedDailyMinutes: 30 })).toBe(false);
  expect(canContinue('O10', { estimatedDailyMinutes: 720 })).toBe(true);
  expect(canContinue('O01', {})).toBe(true);
});
