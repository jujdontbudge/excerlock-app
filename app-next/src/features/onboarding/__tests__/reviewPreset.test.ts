import { applyReviewPreset, isReviewPresetName } from '../reviewPreset';

test('exact trimmed reviewer name is case-sensitive', () => {
  expect(isReviewPresetName('  App Review  ')).toBe(true);
  expect(isReviewPresetName('app review')).toBe(false);
});

test('applies a visible 20-step all-day rule on the device-local weekday once', () => {
  const original = { name: 'App Review', ruleId: 'stable', stepGoal: 5000 };
  const applied = applyReviewPreset(original, {
    enabled: true,
    now: '2026-09-07T01:00:00.000Z',
    timezone: 'America/Chicago',
  });
  expect(applied).toEqual(expect.objectContaining({
    ruleId: 'stable', activity: 'walking', walkingMode: 'steps', stepGoal: 20,
    days: [0], allDay: true, reviewPresetApplied: true,
  }));
  expect(applyReviewPreset({ ...applied, stepGoal: 500 }, {
    enabled: true,
    now: '2026-09-08T01:00:00.000Z',
    timezone: 'America/Chicago',
  }).stepGoal).toBe(500);
});
