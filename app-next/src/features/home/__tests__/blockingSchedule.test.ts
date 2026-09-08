import { blockingSchedule } from '../blockingSchedule';
import { Rule } from '../../../domain/types';
import { rule } from '../../../domain/__tests__/fixtures';

// A Monday, so the fixture's Monday-to-Friday schedule has an instance and Sunday has none.
const DAY = '2026-09-07';
const TZ = 'America/New_York';
const schedule = (rules: Rule | Rule[], hint?: Rule) => {
  const list = Array.isArray(rules) ? rules : [rules];
  return blockingSchedule(list, hint ?? list[0], DAY, TZ);
};

test('uses the selected live rule’s schedule and full goal', () => {
  const model = schedule(rule);
  expect(model.start).toBe('9 AM');
  expect(model.end).toBe('9 PM');
  expect(model.message).toBe('Block from 9 AM to 9 PM\nuntil you walk 5,000 steps');
});
test('gym arrival matches onboarding copy with the actual times', () => {
  expect(
    schedule({
      ...rule,
      activity: 'gym',
      mode: { kind: 'event', activity: 'gym', trigger: 'arrival' },
      schedule: { ...rule.schedule, window: { kind: 'range', startMinute: 720, endMinute: 1200 } },
    }).message,
  ).toBe('Block from 12 PM to 8 PM\nuntil you arrive\nat the gym');
});
test('overnight and all-day schedules remain explicit', () => {
  expect(
    schedule({
      ...rule,
      schedule: { ...rule.schedule, window: { kind: 'range', startMinute: 1200, endMinute: 120 } },
    }).end,
  ).toBe('2 AM · next day');
  expect(schedule({ ...rule, schedule: { ...rule.schedule, window: { kind: 'allDay' } } }).message).toContain(
    'Block all day',
  );
});
test('walking state does not claim a permanent unlock', () => {
  expect(schedule({ ...rule, mode: { kind: 'state', activity: 'walking', place: 'outside' } }).message).toContain(
    'unlock while you walk',
  );
});

test('two disjoint windows produce two timeline segments and one summary', () => {
  const evening = {
    ...rule,
    id: 'evening',
    schedule: { ...rule.schedule, window: { kind: 'range', startMinute: 1080, endMinute: 1320 } as const },
  };
  const model = schedule(
    [{ ...rule, schedule: { ...rule.schedule, window: { kind: 'range', startMinute: 540, endMinute: 720 } } }, evening],
    rule,
  );
  expect(model.segments).toEqual([
    { startMinute: 540, endMinute: 720 },
    { startMinute: 1080, endMinute: 1320 },
  ]);
  expect(model.message).toBe(
    'Block from 9 AM to 12 PM and 6 PM to 10 PM\nuntil you walk 5,000 steps',
  );
});

test('overlapping and all-day windows merge for the timeline', () => {
  const overlap = {
    ...rule,
    id: 'overlap',
    schedule: { ...rule.schedule, window: { kind: 'range', startMinute: 600, endMinute: 1320 } as const },
  };
  expect(schedule([rule, overlap], rule).segments).toEqual([{ startMinute: 540, endMinute: 1320 }]);
  const allDay = { ...rule, id: 'all-day', schedule: { ...rule.schedule, window: { kind: 'allDay' } as const } };
  expect(schedule([rule, allDay], rule).segments).toEqual([{ startMinute: 0, endMinute: 1440 }]);
});

test('an overnight window draws to day end and keeps its next-day label', () => {
  const overnight = {
    ...rule,
    schedule: { ...rule.schedule, window: { kind: 'range', startMinute: 1200, endMinute: 120 } as const },
  };
  const model = schedule([overnight], overnight);
  expect(model.segments).toEqual([{ startMinute: 1200, endMinute: 1440 }]);
  expect(model.message).toContain('8 PM to 2 AM · next day');
});

test("last night's overnight window still draws across this morning", () => {
  const overnight: Rule = {
    ...rule,
    schedule: { ...rule.schedule, days: [0, 1], window: { kind: 'range', startMinute: 1200, endMinute: 120 } },
  };
  expect(schedule([overnight], overnight).segments).toEqual([
    { startMinute: 0, endMinute: 120 },
    { startMinute: 1200, endMinute: 1440 },
  ]);
});

test('a rule that is paused or off today draws nothing', () => {
  expect(schedule([{ ...rule, enabled: false }], rule).segments).toEqual([]);
  expect(schedule([{ ...rule, schedule: { ...rule.schedule, days: [0, 6] } }], rule).segments).toEqual([]);
});
