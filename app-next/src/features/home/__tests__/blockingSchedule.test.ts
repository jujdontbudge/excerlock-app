import { blockingSchedule } from '../blockingSchedule';
import { rule } from '../../../domain/__tests__/fixtures';
test('uses the selected live rule’s schedule and full goal', () => {
  const model = blockingSchedule(rule);
  expect(model.start).toBe('9\u00a0AM');
  expect(model.end).toBe('9\u00a0PM');
  expect(model.message).toBe('Block from 9\u00a0AM to 9\u00a0PM\nuntil you walk 5,000 steps');
});
test('gym arrival matches onboarding copy with the actual times', () => {
  expect(
    blockingSchedule({
      ...rule,
      activity: 'gym',
      mode: { kind: 'event', activity: 'gym', trigger: 'arrival' },
      schedule: { ...rule.schedule, window: { kind: 'range', startMinute: 720, endMinute: 1200 } },
    }).message,
  ).toBe('Block from 12\u00a0PM to 8\u00a0PM\nuntil you arrive\nat the gym');
});
test('overnight and all-day schedules remain explicit', () => {
  expect(
    blockingSchedule({
      ...rule,
      schedule: { ...rule.schedule, window: { kind: 'range', startMinute: 1200, endMinute: 120 } },
    }).end,
  ).toBe('2\u00a0AM · next day');
  expect(blockingSchedule({ ...rule, schedule: { ...rule.schedule, window: { kind: 'allDay' } } }).message).toContain(
    'Block all day',
  );
});
test('walking state does not claim a permanent unlock', () => {
  expect(
    blockingSchedule({ ...rule, mode: { kind: 'state', activity: 'walking', place: 'outside' } }).message,
  ).toContain('unlock while you walk');
});

test('two disjoint windows produce two timeline segments and one summary', () => {
  const evening = {
    ...rule,
    id: 'evening',
    schedule: { ...rule.schedule, window: { kind: 'range', startMinute: 1080, endMinute: 1320 } as const },
  };
  const model = blockingSchedule(
    [{ ...rule, schedule: { ...rule.schedule, window: { kind: 'range', startMinute: 540, endMinute: 720 } } }, evening],
    rule,
  );
  expect(model.segments).toEqual([
    { startMinute: 540, endMinute: 720 },
    { startMinute: 1080, endMinute: 1320 },
  ]);
  expect(model.message).toBe(
    'Block from 9\u00a0AM to 12\u00a0PM and 6\u00a0PM to 10\u00a0PM\nuntil you walk 5,000 steps',
  );
});

test('overlapping and all-day windows merge for the timeline', () => {
  const overlap = {
    ...rule,
    id: 'overlap',
    schedule: { ...rule.schedule, window: { kind: 'range', startMinute: 600, endMinute: 1320 } as const },
  };
  expect(blockingSchedule([rule, overlap], rule).segments).toEqual([{ startMinute: 540, endMinute: 1320 }]);
  const allDay = { ...rule, id: 'all-day', schedule: { ...rule.schedule, window: { kind: 'allDay' } as const } };
  expect(blockingSchedule([rule, allDay], rule).segments).toEqual([{ startMinute: 0, endMinute: 1440 }]);
});

test('an overnight window draws to day end and keeps its next-day label', () => {
  const overnight = {
    ...rule,
    schedule: { ...rule.schedule, window: { kind: 'range', startMinute: 1200, endMinute: 120 } as const },
  };
  const model = blockingSchedule([overnight], overnight);
  expect(model.segments).toEqual([{ startMinute: 1200, endMinute: 1440 }]);
  expect(model.message).toContain('8\u00a0PM to 2\u00a0AM · next day');
});
