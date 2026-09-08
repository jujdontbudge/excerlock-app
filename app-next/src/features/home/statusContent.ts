import { LockDecision, LockedApps, Permissions, Rule } from '../../domain/types';
import { IconName } from '../../icons/Icon';
import { dayKey } from '../../domain/schedule';
import { addDays } from '../../domain/calendar';
import { ruleName } from '../../domain/ruleName';
import { domainCopy } from '../../content/domain';
import { homeCopy as c } from '../../content/home';
export type StatusModel = {
  state: string;
  icon: IconName;
  title: string;
  subtitle: string;
  unlocked: boolean;
  action?: 'permission' | 'apps' | 'add' | 'conditions' | 'stop' | 'plans' | 'retry';
  nextChange?: string;
};
type ProvisionalDecision = { state: 'unlockedProvisional'; ruleId: string; minutesToCount?: number };
type HomeDecision =
  | LockDecision
  | ProvisionalDecision
  | { state: 'noRulesToday'; nextLockAt?: string | null };
type Input = {
  decision: HomeDecision;
  rules: Rule[];
  permissions: Permissions;
  apps: LockedApps;
  now: string;
  timezone: string;
  // merge: replace these adapters with P2-T15/T17/T18 selectors.
  lastClaimAt?: string | null;
  caughtUp?: boolean;
  enforcementFailed?: boolean;
  lapsed?: boolean;
};
export function leaseClock(until: string, now: string) {
  const seconds = Math.max(0, Math.ceil((Date.parse(until) - Date.parse(now)) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function statusContent({
  decision: d,
  rules,
  permissions,
  apps,
  now,
  timezone,
  lastClaimAt,
  caughtUp,
  enforcementFailed,
  lapsed,
}: Input): StatusModel {
  const time = (at: string) =>
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone }).format(new Date(at)).replace(/\s(?=[AP]M$)/, '\u00a0');
  const resume = (at: string | null) => {
    if (!at) return c.noNext;
    const day = dayKey(at, timezone),
      today = dayKey(now, timezone);
    const when =
      day === today
        ? c.todayWord
        : day === addDays(today, 1)
          ? c.tomorrow
          : new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: timezone }).format(new Date(at)).replace(/\s/g, ' ');
    return c.resumes(when, time(at));
  };
  const model: StatusModel = {
    state: d.state,
    icon: 'lock-open',
    title: c.open,
    subtitle: c.nothingToday,
    unlocked: true,
  };
  if (lapsed)
    return { ...model, state: 'lapsed', icon: 'shield', title: c.blockingPaused, subtitle: c.nothingBlocked, unlocked: false, action: 'plans' };
  if (enforcementFailed)
    return { ...model, state: 'enforcementFailed', icon: 'lock', title: c.enforcementFailed, subtitle: c.nothingBlocked, unlocked: false, action: 'retry' };
  if (permissions.screenTime !== 'granted')
    return {
      ...model,
      state: 'permissionNeeded',
      icon: 'shield',
      title: c.nothingBlocked,
      subtitle: c.permissionBody,
      unlocked: false,
      action: 'permission',
    };
  if (apps.appCount + apps.categoryCount === 0)
    return {
      ...model,
      state: 'noAppsSelected',
      icon: 'shield',
      title: c.nothingBlocked,
      subtitle: c.noAppsBody,
      unlocked: false,
      action: 'apps',
    };
  if (!rules.length) return { ...model, state: 'noRules', title: c.noRules, subtitle: c.emptyBody, action: 'add' };
  if (rules.every((r) => !r.enabled))
    return { ...model, state: 'allPaused', title: c.paused, subtitle: c.resume, action: 'conditions' };
  if (d.state === 'locked') {
    const hint = d.nextUnlockHint,
      rule = rules.find((r) => r.id === hint.ruleId);
    const action =
      hint.action === 'walk'
        ? c.walk
        : hint.action === 'arrive'
          ? c.arrive
          : `${domainCopy.verbs[rule?.activity ?? 'walking'].toLowerCase()} ${hint.remaining?.toLocaleString('en-US')} ${hint.unit}`;
    return {
      ...model,
      title: c.blockedHeadline,
      icon: 'lock',
      unlocked: false,
      subtitle: lastClaimAt === null ? c.claimPending : c.until(action),
    };
  }
  if (d.state === 'unlockedMet') {
    // merge: P2-T14 supplies byRuleName directly on this decision.
    const byName = 'byRuleName' in d ? d.byRuleName : ruleName(rules.find((rule) => rule.id === d.byRuleId)!);
    return {
      ...model,
      title: c.met,
      subtitle: caughtUp ? c.caughtUp : c.unlockedBy(byName),
      nextChange: resume(d.relockAt),
    };
  }
  if (d.state === 'unlockedProvisional')
    return {
      ...model,
      title: c.provisional,
      subtitle: c.provisionalMinutes(d.minutesToCount ?? 0),
    };
  if (d.state === 'unlockedWalking')
    return { ...model, title: c.walking, subtitle: c.left(leaseClock(d.leaseUntil, now)), action: 'stop' };
  if (d.state === 'beforeWindow')
    return {
      ...model,
      title: c.starts(time(d.nextLockAt)),
      subtitle:
        'getAheadRuleId' in d && d.getAheadRuleId
          ? c.getAhead(ruleName(rules.find((r) => r.id === d.getAheadRuleId)!))
          : c.openUntil,
    };
  if (d.state === 'afterWindow') return { ...model, subtitle: resume(d.nextLockAt) };
  if (d.state === 'noRulesToday' && 'nextLockAt' in d) return { ...model, subtitle: resume(d.nextLockAt ?? null) };
  return model;
}
