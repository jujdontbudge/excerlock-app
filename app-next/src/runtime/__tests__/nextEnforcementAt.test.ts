import { nextEnforcementAt } from '../nextEnforcementAt';

test('next enforcement is the earliest future interval, relock, lease or hold deadline', () => {
  const now = '2026-09-07T15:00:00.000Z';
  expect(
    nextEnforcementAt({
      now,
      intervalBoundaries: ['2026-09-07T14:00:00.000Z', '2026-09-07T15:20:00.000Z'],
      relockAt: '2026-09-07T15:15:00.000Z',
      leaseUntil: '2026-09-07T15:10:00.000Z',
      holdsUntil: '2026-09-07T15:05:00.000Z',
    }),
  ).toBe('2026-09-07T15:05:00.000Z');
});

test('next enforcement is null when every deadline is absent or past', () => {
  expect(
    nextEnforcementAt({ now: '2026-09-07T15:00:00.000Z', intervalBoundaries: ['2026-09-07T14:00:00.000Z'] }),
  ).toBeNull();
});
