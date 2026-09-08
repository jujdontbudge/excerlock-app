import { Rule, WalkingSession } from '../../domain/types';
import { gymPlace } from '../places';
import { base, makeRule } from './base';

const thirtyMinutes = (rule: Rule, startMinute = 660): Rule => ({
  ...rule,
  schedule: {
    days: [0, 1, 2, 3, 4, 5, 6],
    window: { kind: 'range', startMinute, endMinute: (startMinute + 30) % 1440 },
  },
});

const walkingRule = (startMinute = 660) =>
  thirtyMinutes(makeRule('walk', { kind: 'state', activity: 'walking', place: 'either' }), startMinute);
const gymRule = () =>
  thirtyMinutes(makeRule('gym', { kind: 'target', activity: 'gym', metric: 'minutes', goal: 30 }));

const walkingSession = (overrides: Partial<WalkingSession> = {}): WalkingSession => ({
  id: 'session-credit-walk',
  ruleId: 'walk',
  placement: 'handheld',
  instanceDay: '2026-09-07',
  startedAt: '2026-09-07T15:00:00.000Z',
  verifiedAt: '2026-09-07T15:00:00.000Z',
  leaseUntil: '2026-09-07T15:15:00.000Z',
  creditedThrough: '2026-09-07T15:00:00.000Z',
  endedAt: null,
  endReason: null,
  graceUntil: null,
  phase: 'walking',
  ...overrides,
});

export const sessionCreditScenarios = [
  base('walking-lease-renewal', 'Walking lease renewal', {
    rules: [walkingRule()],
    ruleDays: [],
    walkingSession: walkingSession(),
  }),
  base('walking-lease-lapse', 'Walking lease lapse', {
    rules: [walkingRule()],
    ruleDays: [],
    clock: { now: '2026-09-07T15:15:00.000Z', timezone: 'America/New_York' },
    walkingSession: walkingSession(),
  }),
  base('treadmill-propped-credit', 'Treadmill propped credit', {
    rules: [
      thirtyMinutes(makeRule('walk', { kind: 'state', activity: 'walking', place: 'treadmill' })),
    ],
    ruleDays: [],
    walkingSession: walkingSession({ placement: 'propped' }),
    gait: 'walking',
  }),
  base('treadmill-framing-expired', 'Treadmill framing expired', {
    rules: [
      thirtyMinutes(makeRule('walk', { kind: 'state', activity: 'walking', place: 'treadmill' })),
    ],
    ruleDays: [],
    walkingSession: walkingSession({
      placement: 'propped',
      phase: 'ended',
      endedAt: '2026-09-07T15:00:30.000Z',
      endReason: 'graceExpired',
    }),
    gait: 'still',
  }),
  base('gym-dwell-background', 'Gym dwell in background', {
    rules: [gymRule()],
    ruleDays: [],
    gym: { places: [gymPlace], presence: 'outside' },
    gymVisits: [
      {
        id: 'background',
        placeId: gymPlace.id,
        enteredAt: '2026-09-07T14:10:00.000Z',
        exitedAt: '2026-09-07T14:40:00.000Z',
        source: 'geofence',
      },
    ],
  }),
  base('gym-visit-blip', 'Gym visit blip', {
    rules: [gymRule()],
    ruleDays: [],
    gym: { places: [gymPlace], presence: 'outside' },
    gymVisits: [
      {
        id: 'blip',
        placeId: gymPlace.id,
        enteredAt: '2026-09-07T14:00:00.000Z',
        exitedAt: '2026-09-07T14:00:20.000Z',
        source: 'geofence',
      },
    ],
  }),
  base('window-ends-mid-walk', 'Window ends mid-walk', {
    rules: [walkingRule()],
    ruleDays: [],
    clock: { now: '2026-09-07T15:29:00.000Z', timezone: 'America/New_York' },
    walkingSession: walkingSession({ leaseUntil: '2026-09-07T15:44:00.000Z' }),
  }),
  base('day-rollover-mid-walk', 'Day rolls over mid-walk', {
    rules: [walkingRule(1425)],
    ruleDays: [],
    clock: { now: '2026-09-08T03:59:00.000Z', timezone: 'America/New_York' },
    walkingSession: walkingSession({
      instanceDay: '2026-09-07',
      startedAt: '2026-09-08T03:45:00.000Z',
      verifiedAt: '2026-09-08T03:45:00.000Z',
      creditedThrough: '2026-09-08T03:59:00.000Z',
      leaseUntil: '2026-09-08T04:14:00.000Z',
    }),
  }),
  base('dst-spring-forward', 'DST spring forward', {
    rules: [walkingRule(120)],
    ruleDays: [],
    clock: { now: '2026-03-08T06:55:00.000Z', timezone: 'America/New_York' },
  }),
  base('dst-fall-back', 'DST fall back', {
    rules: [walkingRule(60)],
    ruleDays: [],
    clock: { now: '2026-11-01T05:15:00.000Z', timezone: 'America/New_York' },
  }),
  base('saturday-rest-day', 'Saturday rest day', {
    rules: [
      {
        ...walkingRule(),
        schedule: { days: [1, 2, 3, 4, 5], window: { kind: 'range', startMinute: 660, endMinute: 690 } },
      },
    ],
    ruleDays: [],
    clock: { now: '2026-09-12T15:00:00.000Z', timezone: 'America/New_York' },
  }),
  base('clock-rewind', 'Clock rewind', {
    rules: [walkingRule()],
    ruleDays: [],
    walkingSession: walkingSession({
      phase: 'ended',
      endedAt: '2026-09-07T15:15:00.000Z',
      endReason: 'leaseLapsed',
      creditedThrough: '2026-09-07T15:15:00.000Z',
    }),
  }),
];
