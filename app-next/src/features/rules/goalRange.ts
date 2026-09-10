import { RuleDraft } from './draft';
export function goalRange(d: RuleDraft): [number, number] {
  return d.activity === 'gym' ? [10, 180] : [500, 30000];
}
export function validGoal(value: number, range: readonly [number, number]) {
  return Number.isFinite(value) && value >= range[0] && value <= range[1];
}
