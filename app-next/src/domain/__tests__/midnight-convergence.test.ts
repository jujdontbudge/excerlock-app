import { LocalInstant } from '../calendar';

/**
 * `localInstant` reports whether it converged on the wall time it was asked for. A zone that never
 * converges is a bug in the caller's assumptions, not a number to quietly use, so every writer that
 * turns a local midnight into an instant asserts convergence in development. These guards are what
 * make that assertion visible.
 */
jest.mock('../calendar', () => {
  const actual = jest.requireActual('../calendar');
  return {
    ...actual,
    localInstant: (day: string, minute: number, timezone: string) => {
      const resolved = actual.localInstant(day, minute, timezone);
      return Object.assign(Object.create(Object.getPrototypeOf(resolved)), resolved, {
        instant: resolved.instant,
        converged: false,
      }) as LocalInstant;
    },
  };
});

const visit = {
  id: 'visit-1',
  placeId: 'gym-1',
  enteredAt: '2026-09-07T14:00:00.000Z',
  exitedAt: '2026-09-07T15:00:00.000Z',
  source: 'geofence' as const,
};

test('a local midnight that does not converge is a development error, not a silent number', () => {
  const { mergedGymVisitIntervals } = require('../gymDwell');
  const { splitAtMidnight } = require('../progressDay');
  const { sessionWindow } = require('../sessions/walkingSession');

  expect(() => mergedGymVisitIntervals([visit], '2026-09-07', 'UTC', '2026-09-07T16:00:00.000Z')).toThrow(
    'LOCAL_MIDNIGHT_DID_NOT_CONVERGE',
  );
  expect(() => splitAtMidnight('2026-09-07T23:00:00.000Z', '2026-09-08T01:00:00.000Z', 'UTC')).toThrow(
    'LOCAL_MIDNIGHT_DID_NOT_CONVERGE',
  );
  expect(() =>
    sessionWindow(
      {
        id: 'session-1',
        ruleId: 'walk',
        placement: 'handheld',
        instanceDay: '2026-09-07',
        startedAt: '2026-09-07T14:00:00.000Z',
        verifiedAt: '2026-09-07T14:00:00.000Z',
        leaseUntil: '2026-09-07T14:15:00.000Z',
        creditedThrough: '2026-09-07T14:00:00.000Z',
        endedAt: null,
        endReason: null,
        phase: 'walking',
      },
      require('./fixtures').rule,
      '2026-09-07T14:00:00.000Z',
      'UTC',
    ),
  ).toThrow('LOCAL_MIDNIGHT_DID_NOT_CONVERGE');
});
