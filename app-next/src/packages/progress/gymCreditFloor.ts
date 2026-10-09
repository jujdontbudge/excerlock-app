import type { Rule } from '../model/types';
export function gymCreditFloor(rule: Pick<Rule, 'createdAt'>): number {
  const created = Date.parse(rule.createdAt);
  return Number.isFinite(created) ? created : -Infinity;
}
export function creditedGymVisit<T extends { confirmedAt: number }>(visit: T, rule: Pick<Rule, 'createdAt'>): boolean {
  return visit.confirmedAt >= gymCreditFloor(rule);
}
