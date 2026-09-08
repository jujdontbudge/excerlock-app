import { makeRule } from '../../../demo/scenarios/base';
import { unlockEntries } from '../entry';
import { Rule } from '../../../domain/types';

test('unlockEntries maps each supported rule to its ordered Home pills', () => {
  const state = (place: 'treadmill' | 'either' | 'outside') =>
    makeRule(place, { kind: 'state', activity: 'walking', place });
  const walkingMinutes = {
    ...makeRule(),
    mode: { kind: 'target', activity: 'walking', metric: 'minutes', goal: 20, place: 'either' },
  } as unknown as Rule;

  expect(unlockEntries(makeRule('gym-arrival', { kind: 'event', activity: 'gym', trigger: 'arrival' }))).toEqual([
    'gym',
  ]);
  expect(unlockEntries(makeRule('gym-minutes', { kind: 'target', activity: 'gym', metric: 'minutes', goal: 20 }))).toEqual([
    'gym',
  ]);
  expect(unlockEntries(state('treadmill'))).toEqual(['treadmill']);
  expect(unlockEntries(state('either'))).toEqual(['treadmill', 'handheld']);
  expect(unlockEntries(state('outside'))).toEqual(['handheld']);
  expect(unlockEntries(walkingMinutes)).toEqual(['treadmill', 'handheld']);
  expect(unlockEntries(makeRule())).toEqual([]);
  expect(unlockEntries(makeRule('run', { kind: 'target', activity: 'running', metric: 'minutes', goal: 20 }))).toEqual([]);
});
