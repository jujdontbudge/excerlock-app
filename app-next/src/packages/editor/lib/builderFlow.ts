import { RuleDraft, isBankDraft } from '../../conditions/draft';
import { ScheduleDraft, scheduleIssues } from '../../conditions/scheduleDraft';
import { goalRange, validGoal } from '../../conditions/goalRange';
export function builderPath(d: RuleDraft, staging = false): string[] {
  const branch =
    d.activity === 'walking'
      ? ['W1', 'W2', ...(d.walkingMode === 'bank' ? ['D'] : d.walkingMode !== 'state' ? ['W3'] : [])]
      : ['G1', ...(staging ? [] : ['GPlace']), ...(d.gymMode === 'bank' ? ['D'] : d.gymMode === 'time' ? ['G2'] : [])];
  return ['O20', ...branch, ...(isBankDraft(d) ? [] : ['S1']), ...(staging ? [] : ['S3'])];
}
export function builderValid(step: string, d: RuleDraft, s: ScheduleDraft, chosen: boolean) {
  if (step === 'O20') return chosen;
  if (step === 'S1') return scheduleIssues(s).length === 0;
  if (step === 'W3') {
    const value = d.walkingMode === 'minutes' ? d.walkMinutes : d.stepGoal;
    return d.walkingMode === 'minutes'
      ? Number.isInteger(value) && value >= 5 && value <= 180
      : Number.isFinite(value) && value >= 500 && value <= 30000 && value % 500 === 0;
  }
  if (step === 'G2') return validGoal(d.gymMinutes, goalRange(d));
  return true;
}
