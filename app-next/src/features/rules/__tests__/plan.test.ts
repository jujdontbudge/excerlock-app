import { draftFromAnswers, commitPlan } from '../plan';
import { rulesStore } from '../../../state/rulesStore';
import { profileStore } from '../../../state/profileStore';
import { onboardingStore } from '../../../state/onboardingStore';
import { toRule } from '../draft';
import { validateRule } from '../../../domain/validateRule';
const schedule = { days: [1 as const], window: { kind: 'allDay' as const } };
test.each([
  { activity: 'walking', walkingMode: 'target', stepGoal: 6000 },
  { activity: 'walking', walkingMode: 'state' },
  { activity: 'gym', gymMode: 'arrival' },
  { activity: 'gym', gymMode: 'time', gymMinutes: 45 },
  { activity: 'running', runMode: 'distance', distance: 3, unit: 'km' },
  { activity: 'running', runMode: 'minutes', minutes: 20 },
  { activity: 'biking', bikeMode: 'distance', distance: 8, unit: 'km' },
  { activity: 'biking', bikeMode: 'minutes', minutes: 30 },
])('summary draft is valid for $activity $walkingMode $gymMode $runMode $bikeMode', (a) => {
  const answers = JSON.parse(JSON.stringify(a));
  expect(validateRule(toRule(draftFromAnswers(answers, 'mi'), schedule))).toEqual([]);
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
