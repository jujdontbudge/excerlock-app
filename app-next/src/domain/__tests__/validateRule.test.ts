import { validateRule } from '../validateRule';
import { rule } from './fixtures';
test('invalid data cannot create a condition; every activity keeps its prescribed bounds', () => {
  expect(validateRule(rule)).toEqual([]);
  for (const invalid of [
    null,
    {},
    { ...rule, activity: 'swimming' },
    { ...rule, enabled: 'yes' },
    { ...rule, id: '' },
    { ...rule, createdAt: 'bad' },
    { ...rule, mode: { ...rule.mode, goal: 750 } },
    { ...rule, schedule: { days: [], window: { kind: 'allDay' } } },
    { ...rule, schedule: { days: [8], window: { kind: 'allDay' } } },
    { ...rule, schedule: { days: [1], window: { kind: 'range', startMinute: 60, endMinute: 60 } } },
    { ...rule, schedule: { days: [1], window: { kind: 'range', startMinute: 60, endMinute: 70 } } },
  ])
    expect(validateRule(invalid).length).toBeGreaterThan(0);
  const modes = [
    { kind: 'state', activity: 'walking', place: 'either' },
    { kind: 'state', activity: 'walking', place: 'outside' },
    { kind: 'state', activity: 'walking', place: 'treadmill' },
    { kind: 'event', activity: 'gym', trigger: 'arrival' },
    { kind: 'target', activity: 'walking', metric: 'steps', goal: 500, place: 'outside' },
    { kind: 'target', activity: 'walking', metric: 'steps', goal: 30000, place: 'either' },
    { kind: 'target', activity: 'gym', metric: 'minutes', goal: 10 },
    { kind: 'target', activity: 'gym', metric: 'minutes', goal: 180 },
  ];
  for (const mode of modes) {
    expect(validateRule({ ...rule, activity: mode.activity, mode })).toEqual([]);
    if (mode.kind === 'target')
      expect(validateRule({ ...rule, activity: mode.activity, mode: { ...mode, goal: 99999 } }).length).toBeGreaterThan(
        0,
      );
  }
});
test('malformed modes and missing schedule fields are rejected at hydration', () => {
  for (const invalid of [
    { ...rule, mode: { ...rule.mode, place: 'indoors' } },
    { ...rule, activity: 'gym', mode: { kind: 'state', activity: 'gym' } },
    { ...rule, mode: { kind: 'event', activity: 'walking', place: 'either', trigger: 'arrival' } },
    { ...rule, mode: { kind: 'rate', activity: 'walking', place: 'either' } },
    { ...rule, mode: { ...rule.mode, metric: 'distance', unit: 'km' } },
    ...JSON.parse(
      `[{"id":"run","activity":"running","mode":{"kind":"target","activity":"running","metric":"minutes","goal":20},
        "schedule":{"days":[1],"window":{"kind":"allDay"}},"enabled":true,
        "createdAt":"2026-09-01T00:00:00Z","updatedAt":"2026-09-01T00:00:00Z"},
        {"id":"bike","activity":"biking","mode":{"kind":"target","activity":"biking","metric":"distance","goal":5,"unit":"mi"},
        "schedule":{"days":[1],"window":{"kind":"allDay"}},"enabled":true,
        "createdAt":"2026-09-01T00:00:00Z","updatedAt":"2026-09-01T00:00:00Z"}]`,
    ).map((mode: unknown) => ({ ...rule, ...(mode as object) })),
    { ...rule, schedule: { days: [1] } },
    { ...rule, schedule: { days: [1], window: { kind: 'unknown' } } },
  ])
    expect(validateRule(invalid).length).toBeGreaterThan(0);
});
