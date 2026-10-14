import { Activity } from '../model/types';
import { Answers } from '../model/answers';
import { createDraft, RuleDraft } from './draft';
export function draftFromAnswers(a: Answers, base?: RuleDraft): RuleDraft {
  const activity = (a.activity ?? 'walking') as Activity;
  const d = base?.activity === activity ? base : createDraft(activity);
  const number = (value: unknown, fallback: number) => (value === '' ? NaN : Number(value ?? fallback));
  return {
    ...d,
    id: String(a.ruleId ?? d.id),
    createdAt: String(a.ruleCreatedAt ?? d.createdAt),
    walkingMode: ['minutes', 'state', 'bank'].includes(String(a.walkingMode)) ? a.walkingMode as 'minutes' | 'state' | 'bank' : 'steps',
    difficulty: a.difficulty === 'easy' || a.difficulty === 'hard' ? a.difficulty : 'medium',
    stepGoal: number(a.stepGoal, 10000),
    walkMinutes: number(a.walkMinutes, 20),
    gymMode: a.gymMode === 'time' || a.gymMode === 'arrival' || a.gymMode === 'presence' || a.gymMode === 'bank' ? a.gymMode : d.gymMode,
    gymMinutes: number(a.gymMinutes, 30),
  };
}
