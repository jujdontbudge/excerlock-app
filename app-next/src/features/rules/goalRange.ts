import { RuleDraft } from './draft';
export function goalRange(d: RuleDraft, distance = false): [number, number] {
  if (!distance) return d.activity === 'gym' ? [10, 180] : [5, 300];
  return d.activity === 'biking' ? (d.unit === 'km' ? [1, 200] : [1, 120]) : d.unit === 'km' ? [0.5, 50] : [0.25, 30];
}
export function validGoal(value: number, range: readonly [number, number]) {
  return Number.isFinite(value) && value >= range[0] && value <= range[1];
}
