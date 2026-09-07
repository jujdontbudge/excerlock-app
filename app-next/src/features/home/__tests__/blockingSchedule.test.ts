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
