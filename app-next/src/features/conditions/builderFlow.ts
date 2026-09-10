import { RuleDraft } from '../rules/draft';
import { ScheduleDraft, scheduleIssues } from '../rules/scheduleDraft';
import { goalRange, validGoal } from '../rules/goalRange';
export function builderPath(d: RuleDraft): string[] {
  const branch =
    d.activity === 'walking'
      ? ['W1', 'W2', ...(d.walkingMode === 'target' ? ['W3'] : [])]
      : ['G1', 'GPlace', ...(d.gymMode === 'time' ? ['G2'] : [])];
  return ['O20', ...branch, 'S1', 'S3'];
}
export function builderValid(step: string, d: RuleDraft, s: ScheduleDraft, chosen: boolean) {
  if (step === 'O20') return chosen;
  if (step === 'S1') return scheduleIssues(s).length === 0;
  if (step === 'W3')
    return Number.isFinite(d.stepGoal) && d.stepGoal >= 500 && d.stepGoal <= 30000 && d.stepGoal % 500 === 0;
  if (step === 'G2') return validGoal(d.gymMinutes, goalRange(d));
  return true;
}
