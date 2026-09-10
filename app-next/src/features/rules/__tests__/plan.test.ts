import { draftFromAnswers, commitPlan } from '../plan';
import { rulesStore } from '../../../state/rulesStore';
import { profileStore } from '../../../state/profileStore';
import { onboardingStore } from '../../../state/onboardingStore';
import { toRule } from '../draft';
import { validateRule } from '../../../domain/validateRule';
import type { Rule } from '../../../domain/types';
import { SchedulePlanError } from '../../../domain/scheduleRepresentability';
const schedule = { days: [1 as const], window: { kind: 'allDay' as const } };
test.each([
  { activity: 'walking', walkingMode: 'steps', stepGoal: 6000 },
  { activity: 'walking', walkingMode: 'state' },
  { activity: 'gym', gymMode: 'arrival' },
  { activity: 'gym', gymMode: 'time', gymMinutes: 45 },
  { activity: 'gym', gymMode: 'time', gymMinutes: 10 },
  { activity: 'gym', gymMode: 'time', gymMinutes: 180 },
  { activity: 'walking', walkingMode: 'steps', stepGoal: 500 },
  { activity: 'walking', walkingMode: 'steps', stepGoal: 30000 },
])('summary draft is valid for $activity $walkingMode $gymMode', (a) => {
  const answers = JSON.parse(JSON.stringify(a));
  expect(validateRule(toRule(draftFromAnswers(answers), schedule))).toEqual([]);
});
test('commit is idempotent, stores profile answers, and marks the rule step done', () => {
  rulesStore.getState().reset();
  profileStore.getState().reset();
  onboardingStore.getState().reset();
  const a = {
    activity: 'walking',
    name: ' Alex ',
    mainReason: 'focus',
    days: [1, 2, 3],
    ruleId: 'first-rule',
    ruleCreatedAt: '2026-09-06T12:00:00Z',
  };
  commitPlan(a, 'mi');
  commitPlan(a, 'mi');
  expect(rulesStore.getState().data.rules).toHaveLength(1);
  expect(profileStore.getState().data.name).toBe('Alex');
  expect(onboardingStore.getState().data.answers.ruleCommitted).toBe(true);
});

test('commit rejects an unsupported full union before writing onboarding or profile state', () => {
  rulesStore.getState().reset();
  profileStore.getState().reset();
  onboardingStore.getState().reset();
  const rules: Rule[] = Array.from({ length: 7 }, (_, index) => ({
    id: `rule-${index}`,
    activity: 'walking',
    mode: { kind: 'target', activity: 'walking', metric: 'steps', goal: 5000 },
    schedule: { days: [1], window: { kind: 'range', startMinute: index * 60, endMinute: index * 60 + 30 } },
    enabled: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  }));
  rulesStore.getState().patch({ rules });

  expect(() =>
    commitPlan(
      {
        activity: 'walking',
        name: 'Alex',
        days: [1],
        startMinute: 420,
        endMinute: 450,
        ruleId: 'eighth',
        ruleCreatedAt: '2026-09-06T12:00:00.000Z',
      },
      'mi',
      undefined,
      { now: '2026-09-06T12:00:00.000Z', timezone: 'UTC' },
    ),
  ).toThrow(SchedulePlanError);
  expect(rulesStore.getState().data.rules).toEqual(rules);
  expect(profileStore.getState().data.name).toBe('');
  expect(onboardingStore.getState().data.answers.ruleCommitted).not.toBe(true);
});
