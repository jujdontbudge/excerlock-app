import { createDraft, reduceDraft, toRule, fromRule } from '../draft';
import { validateRule } from '../../../domain/validateRule';
import { Schedule } from '../../../domain/types';
const schedule: Schedule = { days: [1, 2, 3, 4, 5], window: { kind: 'allDay' } };
test('walking defaults, edits, serialization and identity survive a round trip', () => {
  let d = createDraft('walking');
  d = reduceDraft(d, { type: 'setStepGoal', value: 6500 });
  const r = toRule(d, schedule);
  expect(r.mode).toEqual({ kind: 'target', activity: 'walking', metric: 'steps', goal: 6500 });
  expect(validateRule(r)).toEqual([]);
  expect(toRule(fromRule(r), schedule)).toEqual(r);
  expect(toRule(reduceDraft(d, { type: 'setWalkingMode', value: 'state' }), schedule).mode.kind).toBe('state');
});
test.each(['walking', 'gym'] as const)('%s defaults produce a valid rule', (activity) => {
  expect(validateRule(toRule(createDraft(activity), schedule))).toEqual([]);
});
test('gym time and arrival modes serialize through a round trip', () => {
  let gym = reduceDraft(createDraft('gym'), { type: 'setGymMode', value: 'time' });
  gym = reduceDraft(gym, { type: 'setGymMinutes', value: 45 });
  expect(toRule(gym, schedule).mode).toMatchObject({ goal: 45 });
  expect(toRule(fromRule(toRule(gym, schedule)), schedule)).toEqual(toRule(gym, schedule));
  gym = reduceDraft(gym, { type: 'setGymMode', value: 'arrival' });
  expect(toRule(gym, schedule).mode.kind).toBe('event');
  expect(toRule(fromRule(toRule(gym, schedule)), schedule)).toEqual(toRule(gym, schedule));
  gym = reduceDraft(gym, { type: 'setGymMode', value: 'presence' });
  expect(toRule(gym, schedule).mode).toEqual({ kind: 'state', activity: 'gym' });
  expect(toRule(fromRule(toRule(gym, schedule)), schedule)).toEqual(toRule(gym, schedule));
});
test('invalid goal and schedule cannot become saved rules', () => {
  const d = reduceDraft(createDraft('walking'), { type: 'setStepGoal', value: 125 });
  expect(() => toRule(d, schedule)).toThrow('goal');
  expect(() => toRule(createDraft('walking'), { ...schedule, days: [] })).toThrow('days');
});
