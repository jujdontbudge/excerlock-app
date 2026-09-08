import { addDays, localInstant } from './calendar';
import { currentInstances, dayKey, isActiveAt, nextInstanceStart, windowInstances } from './schedule';
import { EarnedUnlock, GymPresence, LockDecision, Rule, RuleDay, WalkingSession } from './types';
import { unlockHint } from './unlockHint';

export type LockInput = {
  now: string;
  timezone: string;
  rules: Rule[];
  ruleDays: RuleDay[];
  earnedUnlocks: EarnedUnlock[];
  walkingSession: WalkingSession | null;
  gymPresence: GymPresence | null;
};

const byActiveOrder = (now: string, timezone: string) => (left: Rule, right: Rule) => {
  const leftStart = currentInstances(left, now, timezone)[0].start;
  const rightStart = currentInstances(right, now, timezone)[0].start;
  return leftStart.localeCompare(rightStart) || left.createdAt.localeCompare(right.createdAt);
};

export function resolveLock({
  now,
  timezone,
  rules,
  ruleDays,
  earnedUnlocks,
  walkingSession,
  gymPresence,
}: LockInput): LockDecision {
  const nowMs = Date.parse(now);
  const enabled = rules.filter((rule) => rule.enabled);
  const today = dayKey(now, timezone);
  const active = enabled.filter((rule) => isActiveAt(rule, now, timezone)).sort(byActiveOrder(now, timezone));

  if (
    walkingSession &&
    (walkingSession.phase === 'walking' || walkingSession.phase === 'grace') &&
    Date.parse(walkingSession.leaseUntil) > nowMs &&
    active.some((rule) => rule.id === walkingSession.ruleId && rule.mode.kind === 'state')
  ) {
    return {
      state: 'unlockedWalking',
      sessionRuleId: walkingSession.ruleId,
      leaseUntil: walkingSession.leaseUntil,
    };
  }

  const earned = earnedUnlocks
    .filter((unlock) => unlock.day <= today && (unlock.day === today || Date.parse(unlock.windowEnd) > nowMs))
    .sort((left, right) => left.metAt.localeCompare(right.metAt) || left.ruleId.localeCompare(right.ruleId))[0];
  if (earned) {
    const nextDay = localInstant(addDays(earned.day, 1), 0, timezone);
    return {
      state: 'unlockedMet',
      byRuleId: earned.ruleId,
      byName: earned.ruleName,
      metAt: earned.metAt,
      relockAt: nextInstanceStart(enabled, new Date(Date.parse(nextDay) - 1).toISOString(), timezone),
    };
  }

  const gymRule =
    gymPresence && Date.parse(gymPresence.confirmedAt) <= nowMs && Date.parse(gymPresence.holdsUntil) > nowMs
      ? active.find((rule) => rule.activity === 'gym')
      : undefined;
  if (gymRule && gymPresence) {
    return {
      state: 'unlockedProvisional',
      byRuleId: gymRule.id,
      placeId: gymPresence.placeId,
      holdsUntil: gymPresence.holdsUntil,
    };
  }

  if (active.length) {
    const rows = active.flatMap((rule) =>
      currentInstances(rule, now, timezone).flatMap((instance) =>
        ruleDays.filter((row) => row.ruleId === rule.id && row.day === instance.day),
      ),
    );
    return {
      state: 'locked',
      activeRuleIds: active.map((rule) => rule.id),
      nextUnlockHint: unlockHint(active, rows),
    };
  }

  const starts = enabled
    .flatMap((rule) => windowInstances(rule, today, timezone).map((instance) => ({ instance, rule })))
    .filter(({ instance }) => Date.parse(instance.start) > nowMs)
    .sort(
      (left, right) =>
        left.instance.start.localeCompare(right.instance.start) ||
        left.rule.createdAt.localeCompare(right.rule.createdAt),
    );
  if (starts.length) {
    const first = starts[0];
    const getAhead = starts.find(
      ({ instance, rule }) => instance.start === first.instance.start && rule.mode.kind === 'target',
    );
    return {
      state: 'beforeWindow',
      nextLockAt: first.instance.start,
      ruleId: first.rule.id,
      getAheadRuleId: getAhead?.rule.id ?? null,
    };
  }

  const ended = [addDays(today, -1), today]
    .flatMap((day) => enabled.flatMap((rule) => windowInstances(rule, day, timezone)))
    .some((instance) => dayKey(instance.end, timezone) === today && Date.parse(instance.end) <= nowMs);
  const nextLockAt = nextInstanceStart(enabled, now, timezone);
  return ended ? { state: 'afterWindow', nextLockAt } : { state: 'noRulesToday', nextLockAt };
}
