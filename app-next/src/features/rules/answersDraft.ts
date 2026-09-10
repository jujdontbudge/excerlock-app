import { Activity } from '../../domain/types';
import { Answers } from '../../onboarding/types';
import { createDraft, RuleDraft } from './draft';
export function draftFromAnswers(a: Answers, base?: RuleDraft): RuleDraft {
  const activity = (a.activity ?? 'walking') as Activity;
  const d = base?.activity === activity ? base : createDraft(activity);
  const number = (value: unknown, fallback: number) => (value === '' ? NaN : Number(value ?? fallback));
  return {
    ...d,
    id: String(a.ruleId ?? d.id),
    createdAt: String(a.ruleCreatedAt ?? d.createdAt),
    place: (a.walkPlace ?? 'outside') as RuleDraft['place'],
    walkingMode: a.walkingMode === 'state' ? 'state' : 'target',
    stepGoal: number(a.stepGoal, 5000),
    gymMode: a.gymMode === 'arrival' ? 'arrival' : 'time',
    gymMinutes: number(a.gymMinutes, 30),
  };
}
