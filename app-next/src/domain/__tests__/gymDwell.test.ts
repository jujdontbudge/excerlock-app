import { GymVisit } from '../types';
import {
  arrivalFor,
  gymDwellMinutes,
  mergedGymVisitIntervals,
  shouldReplayArrival,
} from '../gymDwell';
import { Rule } from '../types';

const visit = (overrides: Partial<GymVisit> = {}): GymVisit => ({
  id: 'visit-1',
  placeId: 'gym-1',
  enteredAt: '2026-09-07T14:00:00.000Z',
  exitedAt: '2026-09-07T15:00:00.000Z',
  source: 'geofence',
  ...overrides,
});

test('a closed visit credits its full enter-to-exit interval', () => {
  expect(
    gymDwellMinutes(
      [visit()],
      '2026-09-07',
      'UTC',
      '2026-09-07T16:00:00.000Z',
    ),
  ).toBe(60);
});

test('overlapping visits are counted once', () => {
  expect(
    gymDwellMinutes(
      [
        visit(),
        visit({ id: 'visit-2', enteredAt: '2026-09-07T14:30:00.000Z', exitedAt: '2026-09-07T15:30:00.000Z' }),
      ],
      '2026-09-07',
      'UTC',
      '2026-09-07T16:00:00.000Z',
    ),
  ).toBe(90);
});

test('an exit and re-enter within two minutes is one visit', () => {
  const intervals = mergedGymVisitIntervals(
    [
      visit(),
      visit({ id: 'visit-2', enteredAt: '2026-09-07T15:01:00.000Z', exitedAt: '2026-09-07T16:00:00.000Z' }),
    ],
    '2026-09-07',
    'UTC',
    '2026-09-07T17:00:00.000Z',
  );

  expect(intervals).toHaveLength(1);
  expect(intervals[0].visitIds).toEqual(['visit-1', 'visit-2']);
  expect(gymDwellMinutes(
    [visit(), visit({ id: 'visit-2', enteredAt: '2026-09-07T15:01:00.000Z', exitedAt: '2026-09-07T16:00:00.000Z' })],
    '2026-09-07',
    'UTC',
    '2026-09-07T17:00:00.000Z',
  )).toBe(120);
});

test('an open visit accrues against now and a confirmation blip credits nothing', () => {
  expect(
    gymDwellMinutes(
      [visit({ exitedAt: null })],
      '2026-09-07',
      'UTC',
      '2026-09-07T14:12:00.000Z',
    ),
  ).toBe(12);
  expect(
    gymDwellMinutes(
      [visit({ exitedAt: '2026-09-07T14:00:20.000Z' })],
      '2026-09-07',
      'UTC',
      '2026-09-07T15:00:00.000Z',
    ),
  ).toBe(0);
});

test('a visit crossing midnight splits across local days', () => {
  const overnight = visit({
    enteredAt: '2026-09-07T03:45:00.000Z',
    exitedAt: '2026-09-07T04:15:00.000Z',
  });
  expect(gymDwellMinutes([overnight], '2026-09-06', 'America/New_York', '2026-09-08T00:00:00.000Z')).toBe(15);
  expect(gymDwellMinutes([overnight], '2026-09-07', 'America/New_York', '2026-09-08T00:00:00.000Z')).toBe(15);
});

test('arrival is derived only from an open confirmed visit and ceremony replay waits five minutes', () => {
  const gymRule: Rule = {
    id: 'gym',
    activity: 'gym',
    mode: { kind: 'event', activity: 'gym', trigger: 'arrival' },
    schedule: { days: [1], window: { kind: 'allDay' } },
    enabled: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };
  const open = visit({ exitedAt: null });

  expect(arrivalFor([gymRule], [open], '2026-09-07T14:00:29.999Z')).toBeNull();
  expect(arrivalFor([gymRule], [open], '2026-09-07T14:00:30.000Z')).toEqual({
    placeId: 'gym-1',
    confirmedAt: '2026-09-07T14:00:30.000Z',
    holdsUntil: '2026-09-07T14:00:30.001Z',
  });
  expect(shouldReplayArrival('2026-09-07T14:00:00.000Z', '2026-09-07T14:04:59.999Z')).toBe(false);
  expect(shouldReplayArrival('2026-09-07T14:00:00.000Z', '2026-09-07T14:05:00.000Z')).toBe(true);
});
