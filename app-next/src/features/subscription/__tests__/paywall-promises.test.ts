import { paywallPromises } from '../paywallPromises';

test.each([
  ['lose', 'screenTime', 180, ['Lose the body fat and feel light again', 'Break free from endless scrolling', 'Win back 46 days a year for what matters']],
  ['gain', 'exercise', 60, ["Build the muscle you've always wanted", 'Become someone who loves to move', 'Win back 15 days a year for what matters']],
  ['maintain', 'wellness', 300, ['Stay fit, strong and healthy for life', 'Feel calmer, sharper and full of energy', 'Win back 76 days a year for what matters']],
] as const)('sells the %s body goal, the %s dream and the time they get back', (bodyGoal, improveFirst, minutes, expected) => {
  expect(paywallPromises({ bodyGoal, improveFirst, estimatedDailyMinutes: minutes })).toEqual(expected);
});

test('falls back to the same three dreams when onboarding answers are missing', () => {
  expect(paywallPromises({})).toEqual([
    'Feel stronger and healthier every week',
    'Become the best version of yourself',
    'Win back 46 days a year for what matters',
  ]);
});
