import { ruleName } from '../ruleName';
import { minuteLabel, scheduleLabel } from '../scheduleLabel';
import { rule } from './fixtures';
test('condition names and schedules use the product vocabulary', () => {
  expect(ruleName(rule)).toBe('Walk 5,000 steps');
  expect(ruleName({ ...rule, mode: { kind: 'state', activity: 'walking', place: 'either' } })).toBe(
    'Unlock while walking',
  );
  expect(ruleName({ ...rule, activity: 'gym', mode: { kind: 'event', activity: 'gym', trigger: 'arrival' } })).toBe(
    'Arrive at the gym',
  );
  expect(
    ruleName({
      ...rule,
      activity: 'running',
      mode: { kind: 'target', activity: 'running', metric: 'distance', goal: 2, unit: 'mi' },
    }),
  ).toBe('Run 2 mi');
  expect(
    ruleName({
      ...rule,
      activity: 'biking',
      mode: { kind: 'target', activity: 'biking', metric: 'minutes', goal: 30 },
    }),
  ).toBe('Bike 30 minutes');
  expect(
    ruleName({ ...rule, activity: 'gym', mode: { kind: 'target', activity: 'gym', metric: 'minutes', goal: 30 } }),
  ).toBe('Spend 30 minutes at the gym');
  expect(scheduleLabel(rule.schedule)).toBe('Mon–Fri · 9\u00a0AM–9\u00a0PM');
  expect(scheduleLabel({ days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'allDay' } })).toBe('Every day · All day');
  expect(scheduleLabel({ days: [6, 0], window: { kind: 'range', startMinute: 1200, endMinute: 120 } })).toBe(
    'Sat, Sun · 8\u00a0PM–2\u00a0AM, ends next day',
  );
  expect(scheduleLabel({ days: [2], window: { kind: 'range', startMinute: 0, endMinute: 750 } })).toBe(
    'Tue · 12\u00a0AM–12:30\u00a0PM',
  );
});

test('time suffix stays with its number when a schedule wraps', () => {
  expect(minuteLabel(540)).toBe('9\u00a0AM');
});
