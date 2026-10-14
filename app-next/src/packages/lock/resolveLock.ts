import { gymCreditFloor } from '../progress/gymCreditFloor';
import { unlockHint } from './lib/unlockHint';
import { Rule, RuleDay, LockDecision, GymPresence, WalkingDetection, PlacementEvidence } from '../model/types';
import { dayKey, windowInstances, currentInstances, nextInstanceStart, isActiveAt } from '../schedule/schedule';
import { addDays, localInstant } from '../schedule/calendar';
import { ruleName } from '../conditions/ruleName';
export type LockInput = {
  now: string;
  timezone: string;
  rules: Rule[];
  ruleDays: RuleDay[];
  detection: WalkingDetection;
  placement: PlacementEvidence;
  gymPresence?: GymPresence | null;
  bankMinutes?: number;
};
export const inactiveWalking: WalkingDetection = { state: 'inactive', since: null };
export const unknownPlacement: PlacementEvidence = { state: 'unknown', liveRelief: false, since: null };
export function resolveLock({ now, timezone: tz, rules, ruleDays, detection, placement, gymPresence, bankMinutes = 0 }: LockInput): LockDecision {
  const enabled = rules.filter((r) => r.enabled), today = dayKey(now, tz);
  const bank = enabled.find((rule) => rule.mode.kind === 'bank');
  if (bank) return bankMinutes > 0 ? { state: 'unlockedBank', ruleId: bank.id } : { state: 'locked', activeRuleIds: [bank.id], nextUnlockHint: { ruleId: bank.id, action: 'shop', remaining: null, unit: null } };
  const active = enabled.filter((r) => isActiveAt(r, now, tz));
  for (const row of ruleDays.filter((d) => d.day >= addDays(today, -1) && d.day <= today && d.met && d.metAt && Date.parse(d.metAt) <= Date.parse(now)).sort((a, b) => b.day.localeCompare(a.day))) {
    const rule = enabled.find((r) => r.id === row.ruleId && r.mode.kind !== 'state');
    if (!rule || row.day > today) continue;
    const instance = windowInstances(rule, row.day, tz)[0];
    if (!instance) continue;
    const cutoff = localInstant(addDays(row.day, 1), 0, tz);
    const relockAt = nextInstanceStart(enabled, new Date(Date.parse(cutoff) - 1).toISOString(), tz);
    if (relockAt && Date.parse(relockAt) <= Date.parse(now)) continue;
    return { state: 'unlockedMet', byRuleId: rule.id, byName: ruleName(rule), metAt: row.metAt!, relockAt };
  }
  const stateRule = active.find((r) => r.mode.kind === 'state' && r.activity === 'walking');
  if (stateRule && detection.state === 'active' && detection.since)
    return { state: 'unlockedWalking', ruleId: stateRule.id, since: detection.since };
  if (stateRule && placement.liveRelief && placement.since)
    return { state: 'unlockedPropped', ruleId: stateRule.id, since: placement.since };
  if (gymPresence?.confirmedAt) {
    const confirmedAt = Date.parse(gymPresence.confirmedAt);
    const gym = active.find((r) => r.activity === 'gym' && confirmedAt >= gymCreditFloor(r));
    if (gym) return { state: 'unlockedAtGym', ruleId: gym.id, placeId: gymPresence.placeId, since: gymPresence.confirmedAt };
  }
  if (active.length) {
    const rows = active.flatMap((rule) => currentInstances(rule, now, tz).flatMap((instance) => ruleDays.filter((d) => d.ruleId === rule.id && d.day === instance.day)));
    return { state: 'locked', activeRuleIds: active.map((r) => r.id), nextUnlockHint: unlockHint(active, rows) };
  }
  const starts = enabled.flatMap((r) => windowInstances(r, today, tz)).filter((w) => Date.parse(w.start) > Date.parse(now)).sort((a, b) => a.start.localeCompare(b.start));
  if (starts.length) return { state: 'beforeWindow', nextLockAt: starts[0].start, ruleId: starts[0].ruleId, getAheadRuleId: starts[0].ruleId };
  const ended = [addDays(today, -1), today].flatMap((d) => enabled.flatMap((r) => windowInstances(r, d, tz))).some((w) => dayKey(w.end, tz) === today && Date.parse(w.end) <= Date.parse(now));
  const nextLockAt = nextInstanceStart(enabled, now, tz);
  return ended ? { state: 'afterWindow', nextLockAt } : { state: 'noRulesToday', nextLockAt };
}
