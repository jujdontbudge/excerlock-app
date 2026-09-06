import { unlockHint } from './unlockHint';
import { Rule, RuleDay, WalkingSession, LockDecision } from './types';
import { dayKey, windowInstances, currentInstances, nextInstanceStart, isActiveAt } from './schedule';
import { addDays, localInstant } from './calendar';
export type LockInput = {
  now: string;
  timezone: string;
  rules: Rule[];
  ruleDays: RuleDay[];
  walkingSession: WalkingSession | null;
};
export function resolveLock({ now, timezone: tz, rules, ruleDays, walkingSession: session }: LockInput): LockDecision {
  const enabled = rules.filter((r) => r.enabled),
    today = dayKey(now, tz);
  const active = enabled.filter((r) => isActiveAt(r, now, tz));
  if (
    session &&
    ['walking', 'grace'].includes(session.phase) &&
    Date.parse(session.leaseUntil) > Date.parse(now) &&
    active.some((r) => r.id === session.ruleId && r.mode.kind === 'state')
  )
    return { state: 'unlockedWalking', sessionRuleId: session.ruleId, leaseUntil: session.leaseUntil };
  for (const row of ruleDays.filter((d) => d.met).sort((a, b) => b.day.localeCompare(a.day))) {
    const rule = enabled.find((r) => r.id === row.ruleId && r.mode.kind !== 'state');
    if (!rule || row.day > today) continue;
    const instance = windowInstances(rule, row.day, tz)[0];
    if (!instance) continue;
    const cutoff = localInstant(addDays(row.day, 1), 0, tz);
    const relockAt = nextInstanceStart(enabled, new Date(Date.parse(cutoff) - 1).toISOString(), tz);
    if (relockAt && Date.parse(relockAt) <= Date.parse(now)) continue;
    return { state: 'unlockedMet', byRuleId: rule.id, relockAt };
  }
  if (active.length) {
    const rows = active.flatMap((rule) =>
      currentInstances(rule, now, tz).flatMap((instance) =>
        ruleDays.filter((d) => d.ruleId === rule.id && d.day === instance.day),
      ),
    );
    return { state: 'locked', activeRuleIds: active.map((r) => r.id), nextUnlockHint: unlockHint(active, rows) };
  }
  const starts = enabled
    .flatMap((r) => windowInstances(r, today, tz))
    .filter((w) => Date.parse(w.start) > Date.parse(now))
    .sort((a, b) => a.start.localeCompare(b.start));
  if (starts.length) return { state: 'beforeWindow', nextLockAt: starts[0].start, ruleId: starts[0].ruleId };
  const ended = [addDays(today, -1), today]
    .flatMap((d) => enabled.flatMap((r) => windowInstances(r, d, tz)))
    .some((w) => dayKey(w.end, tz) === today && Date.parse(w.end) <= Date.parse(now));
  return ended ? { state: 'afterWindow', nextLockAt: nextInstanceStart(enabled, now, tz) } : { state: 'noRulesToday' };
}
