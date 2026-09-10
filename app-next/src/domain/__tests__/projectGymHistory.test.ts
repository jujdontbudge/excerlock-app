import type { GymInterval } from '../gymMachine';
import type { Rule } from '../types';
import { projectGymHistory } from '../projectGymHistory';

const rule = (id: string, mode: Rule['mode'], days: Rule['schedule']['days'] = [3]): Rule => ({
  id, activity: 'gym', mode, enabled: true,
  schedule: { days, window: { kind: 'range', startMinute: 9 * 60, endMinute: 17 * 60 } },
  createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
});
const interval = (id: string, regionId: string, confirmed: string, exited: string | null): GymInterval => ({
  id, regionId, enteredAt: Date.parse(confirmed) - 30_000, confirmedAt: Date.parse(confirmed), exitedAt: exited === null ? null : Date.parse(exited),
});

test('confirmed arrival earns an event before its window using local schedule-day semantics', () => {
  const event = rule('arrival', { kind: 'event', activity: 'gym', trigger: 'arrival' });
  const confirmed = '2026-09-09T12:00:30Z'; // Wednesday 07:00:30 Chicago, before 09:00 window.
  expect(projectGymHistory([event], [], [interval('a', 'gym-a', confirmed, '2026-09-09T12:01:00Z')], ['gym-a'], 'America/Chicago', '2026-09-09T13:00:00Z')).toEqual([
    { ruleId: 'arrival', day: '2026-09-09', progress: 1, met: true, metAt: '2026-09-09T12:00:30.000Z' },
  ]);
});

test('minute targets union overlapping configured gyms without double credit', () => {
  const minutes = rule('minutes', { kind: 'target', activity: 'gym', metric: 'minutes', goal: 45 });
  const rows = projectGymHistory([minutes], [], [
    interval('a', 'gym-a', '2026-09-09T15:00:00Z', '2026-09-09T15:30:00Z'),
    interval('b', 'gym-b', '2026-09-09T15:15:00Z', '2026-09-09T16:00:00Z'),
  ], ['gym-a', 'gym-b'], 'UTC', '2026-09-09T17:00:00Z');
  expect(rows).toEqual([{ ruleId: 'minutes', day: '2026-09-09', progress: 60, met: true, metAt: '2026-09-09T15:45:00.000Z' }]);
});

test('cross-midnight confirmed dwell splits onto each scheduled local day', () => {
  const minutes = rule('minutes', { kind: 'target', activity: 'gym', metric: 'minutes', goal: 20 }, [2, 3]);
  const rows = projectGymHistory([minutes], [], [
    interval('overnight', 'gym-a', '2026-09-09T04:50:00Z', '2026-09-09T05:10:00Z'),
  ], ['gym-a'], 'America/Chicago', '2026-09-09T06:00:00Z');
  expect(rows.map(({ day, progress }) => ({ day, progress }))).toEqual([
    { day: '2026-09-08', progress: 10 }, { day: '2026-09-09', progress: 10 },
  ]);
});

test('deleted-region and future presence fabricate no progress; confirmed arrival needs no dwell minutes', () => {
  const event = rule('arrival', { kind: 'event', activity: 'gym', trigger: 'arrival' });
  const minute = rule('minutes', { kind: 'target', activity: 'gym', metric: 'minutes', goal: 10 });
  const candidates = [
    interval('deleted', 'deleted', '2026-09-09T12:00:00Z', '2026-09-09T13:00:00Z'),
    interval('future', 'gym-a', '2026-09-09T14:00:00Z', null),
    interval('zero', 'gym-a', '2026-09-09T12:00:00Z', '2026-09-09T12:00:00Z'),
  ];
  expect(projectGymHistory([event, minute], [], candidates, ['gym-a'], 'UTC', '2026-09-09T13:00:00Z')).toEqual([
    { ruleId: 'arrival', day: '2026-09-09', progress: 1, met: true, metAt: '2026-09-09T12:00:00.000Z' },
  ]);
});

test('reprojection preserves earned timestamps and unrelated rows', () => {
  const minutes = rule('minutes', { kind: 'target', activity: 'gym', metric: 'minutes', goal: 5 });
  const existing = [
    { ruleId: 'minutes', day: '2026-09-09', progress: 6, met: true, metAt: '2026-09-09T12:06:00Z' },
    { ruleId: 'walk', day: '2026-09-09', progress: 100, met: false, metAt: null },
  ];
  const visit = interval('a', 'gym-a', '2026-09-09T12:00:00Z', '2026-09-09T12:10:00Z');
  const once = projectGymHistory([minutes], existing, [visit], ['gym-a'], 'UTC', '2026-09-09T13:00:00Z');
  expect(once[0].metAt).toBe(existing[0].metAt);
  expect(projectGymHistory([minutes], once, [visit], ['gym-a'], 'UTC', '2026-09-09T14:00:00Z')).toEqual(once);
  expect(once[1]).toEqual(existing[1]);
});

test('walking-minute targets are untouched because step history cannot fabricate active minutes', () => {
  const walking = { ...rule('walk-minutes', { kind: 'target', activity: 'walking', metric: 'minutes', goal: 20 }), activity: 'walking' as const };
  expect(projectGymHistory([walking], [], [interval('a', 'gym-a', '2026-09-09T12:00:00Z', '2026-09-09T13:00:00Z')], ['gym-a'], 'UTC', '2026-09-09T14:00:00Z')).toEqual([]);
});
