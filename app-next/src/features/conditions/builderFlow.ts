import { RuleDraft } from '../rules/draft';
import { ScheduleDraft, scheduleIssues } from '../rules/scheduleDraft';
import { goalRange, validGoal } from '../rules/goalRange';
import { validWalkingMinutes } from '../../domain/walkingDuration';
export function builderPath(d: RuleDraft): string[] {
  const branch =
    d.activity === 'walking'
      ? ['W1', 'W2', ...(d.walkingMode === 'steps' ? ['W3'] : d.walkingMode === 'minutes' ? ['W4'] : [])]
      : d.activity === 'gym'
        ? ['G1', 'GPlace', ...(d.gymMode === 'time' ? ['G2'] : [])]
        : [
            d.activity === 'running' ? 'R1' : 'B1',
            d.runMode === 'distance' ? 'D' : d.activity === 'running' ? 'R2' : 'B2',
          ];
  return ['O20', ...branch, 'S1', 'S3'];
}
export function builderValid(step: string, d: RuleDraft, s: ScheduleDraft, chosen: boolean) {
  if (step === 'O20') return chosen;
  if (step === 'S1') return scheduleIssues(s).length === 0;
  if (step === 'W3')
    return Number.isFinite(d.stepGoal) && d.stepGoal >= 500 && d.stepGoal <= 30000 && d.stepGoal % 500 === 0;
  if (step === 'W4') return validWalkingMinutes(d.walkMinutes);
  if (['G2', 'R2', 'B2', 'D'].includes(step))
    return validGoal(step === 'D' ? d.distance : step === 'G2' ? d.gymMinutes : d.minutes, goalRange(d, step === 'D'));
  return true;
}
