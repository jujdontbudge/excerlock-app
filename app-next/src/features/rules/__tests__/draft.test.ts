import { createDraft, reduceDraft, toRule, fromRule } from '../draft';
import { validateRule } from '../../../domain/validateRule';
import { Schedule } from '../../../domain/types';
const schedule: Schedule = { days: [1, 2, 3, 4, 5], window: { kind: 'allDay' } };
test('walking defaults, edits, serialization and identity survive a round trip', () => {
  let d = createDraft('walking', 'mi');
  d = reduceDraft(d, { type: 'setPlace', value: 'treadmill' });
  d = reduceDraft(d, { type: 'setStepGoal', value: 6500 });
  const r = toRule(d, schedule);
  expect(r.mode).toEqual({ kind: 'target', activity: 'walking', metric: 'steps', goal: 6500, place: 'treadmill' });
  expect(validateRule(r)).toEqual([]);
  expect(toRule(fromRule(r), schedule)).toEqual(r);
  expect(toRule(reduceDraft(d, { type: 'setWalkingMode', value: 'state' }), schedule).mode.kind).toBe('state');
});
test.each(['gym', 'running', 'biking'] as const)('%s defaults produce a valid rule', (activity) => {
  expect(validateRule(toRule(createDraft(activity, 'km'), schedule))).toEqual([]);
});
test('all alternative modes serialize and unit changes retain the number', () => {
  let gym = reduceDraft(createDraft('gym'), { type: 'setGymMinutes', value: 45 });
  expect(toRule(gym, schedule).mode).toMatchObject({ goal: 45 });
  gym = reduceDraft(gym, { type: 'setGymMode', value: 'arrival' });
  expect(toRule(gym, schedule).mode.kind).toBe('event');
  for (const activity of ['running', 'biking'] as const) {
    let d = reduceDraft(createDraft(activity, 'mi'), { type: 'setMinutes', value: 25 });
    expect(toRule(d, schedule).mode).toMatchObject({ goal: 25, metric: 'minutes' });
    d = reduceDraft(d, { type: 'setRunMode', value: 'distance' });
    d = reduceDraft(d, { type: 'setDistance', value: 7, unit: 'km' });
    expect(toRule(d, schedule).mode).toMatchObject({ goal: 7, unit: 'km' });
    expect(toRule(fromRule(toRule(d, schedule)), schedule)).toEqual(toRule(d, schedule));
  }
});
test('invalid goal and schedule cannot become saved rules', () => {
  const d = reduceDraft(createDraft('walking'), { type: 'setStepGoal', value: 125 });
  expect(() => toRule(d, schedule)).toThrow('goal');
  expect(() => toRule(createDraft('walking'), { ...schedule, days: [] })).toThrow('days');
});
