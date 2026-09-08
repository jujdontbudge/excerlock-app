import { migrateRule } from '../migrateRule';
import { rule } from './fixtures';

test('a persisted steps/treadmill rule hydrates as either', () => {
  expect(
    migrateRule({
      ...rule,
      mode: { kind: 'target', activity: 'walking', metric: 'steps', goal: 5000, place: 'treadmill' },
    }),
  ).toMatchObject({ mode: { metric: 'steps', place: 'either' } });
});
