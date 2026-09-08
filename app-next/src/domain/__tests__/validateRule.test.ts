import { migrateRule, MIN_WINDOW_MINUTES, validateRule } from '../validateRule';
import { rule } from './fixtures';
import { scenarios } from '../../demo/scenarios';
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
    { kind: 'event', activity: 'gym', trigger: 'arrival' },
    { kind: 'target', activity: 'gym', metric: 'minutes', goal: 10 },
    { kind: 'target', activity: 'running', metric: 'minutes', goal: 5 },
    { kind: 'target', activity: 'biking', metric: 'minutes', goal: 300 },
    { kind: 'target', activity: 'running', metric: 'distance', unit: 'km', goal: 0.5 },
    { kind: 'target', activity: 'running', metric: 'distance', unit: 'mi', goal: 0.25 },
    { kind: 'target', activity: 'biking', metric: 'distance', unit: 'km', goal: 200 },
    { kind: 'target', activity: 'biking', metric: 'distance', unit: 'mi', goal: 120 },
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
    { ...rule, schedule: { days: [1] } },
    { ...rule, schedule: { days: [1], window: { kind: 'unknown' } } },
  ])
    expect(validateRule(invalid).length).toBeGreaterThan(0);
});

test('blocking windows enforce the thirty-minute minimum across midnight', () => {
  const withWindow = (startMinute: number, endMinute: number) => ({
    ...rule,
    schedule: { days: [1], window: { kind: 'range', startMinute, endMinute } },
  });
  expect(validateRule(withWindow(60, 80))).toContain('window');
  expect(validateRule(withWindow(60, 90))).not.toContain('window');
  expect(validateRule(withWindow(1430, 20))).not.toContain('window');
});

test('persisted 15–29 minute windows hydrate as thirty minutes without dropping the rule', () => {
  const sameDay = migrateRule({
    ...rule,
    schedule: { days: [1], window: { kind: 'range', startMinute: 540, endMinute: 560 } },
  });
  const overnight = migrateRule({
    ...rule,
    schedule: { days: [1], window: { kind: 'range', startMinute: 1430, endMinute: 10 } },
  });
  expect(sameDay.schedule.window).toEqual({ kind: 'range', startMinute: 540, endMinute: 570 });
  expect(overnight.schedule.window).toEqual({ kind: 'range', startMinute: 1430, endMinute: 20 });
  expect(validateRule(sameDay)).toEqual([]);
  expect(validateRule(overnight)).toEqual([]);
  expect(migrateRule({ ...rule, schedule: { days: [1], window: { kind: 'allDay' } } })).toEqual({
    ...rule,
    schedule: { days: [1], window: { kind: 'allDay' } },
  });
  expect(
    migrateRule({ ...rule, schedule: { days: [1], window: { kind: 'range', startMinute: 60, endMinute: 70 } } }),
  ).toEqual({ ...rule, schedule: { days: [1], window: { kind: 'range', startMinute: 60, endMinute: 70 } } });
  expect(migrateRule(rule)).toBe(rule);
});

test('no shipped fixture or scenario violates MIN_WINDOW_MINUTES', () => {
  const shipped = [rule, ...scenarios.flatMap((scenario) => scenario.rules)];
  for (const item of shipped) {
    if (item.schedule.window.kind === 'allDay') continue;
    const { startMinute, endMinute } = item.schedule.window;
    expect((endMinute - startMinute + 1440) % 1440).toBeGreaterThanOrEqual(MIN_WINDOW_MINUTES);
  }
});
