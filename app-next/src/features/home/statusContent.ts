import { LockDecision, LockedApps, Permissions, Rule, WalkingSession } from '../../domain/types';
import { IconName } from '../../icons/Icon';
import { dayKey } from '../../domain/schedule';
import { addDays } from '../../domain/calendar';
import { ruleName } from '../../domain/ruleName';
import { domainCopy } from '../../content/domain';
import { homeCopy as c } from '../../content/home';
import { canEnforce } from '../../domain/canEnforce';
export type StatusModel = {
  state: string;
  icon: IconName;
  title: string;
  subtitle: string;
  unlocked: boolean;
  action?: 'permission' | 'apps' | 'add' | 'conditions' | 'stop' | 'plans' | 'retry';
  /** When this state ends, said alongside a subtitle that explains why it began. */
  nextChange?: string;
};
type Input = {
  decision: LockDecision;
  rules: Rule[];
  permissions: Permissions;
  apps: LockedApps;
  now: string;
  timezone: string;
  /** The last apply result the runtime host published; a failure fails closed and is reported here. */
  enforcement?: { applied: boolean } | null;
  walkingSession?: WalkingSession | null;
  /** `enforcementStore.lastClaimAt`; null means this launch's first claim has not answered yet. */
  lastClaimAt?: string | null;
  /** The claim on open is what completed the goal, so the unlock is explained, not announced. */
  caughtUp?: boolean;
  /** An expired or billing-issue entitlement: the apps are open and the only action is plans. */
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
  enforcement,
  walkingSession = null,
  lastClaimAt,
  caughtUp,
  lapsed,
}: Input): StatusModel {
  const time = (at: string) =>
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone })
      .format(new Date(at))
      .replace(/\s(?=[AP]M$)/, ' ');
  const resume = (at: string | null) => {
    if (!at) return c.noNext;
    const day = dayKey(at, timezone),
      today = dayKey(now, timezone);
    const when =
      day === today
        ? c.todayWord
        : day === addDays(today, 1)
          ? c.tomorrow
          : new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: timezone })
              .format(new Date(at))
              .replace(/\s/g, ' ');
    return c.resumes(when, time(at));
  };
  const model: StatusModel = {
    state: d.state,
    icon: 'lock-open',
    title: c.open,
    subtitle: c.nothingToday,
    unlocked: true,
  };
  // Nothing is being blocked comes before every ordinary state: a lapse, a failed apply and a missing
  // permission all leave the apps open, and none of them is a rest day.
  if (lapsed)
    return {
      ...model,
      state: 'lapsed',
      icon: 'shield',
      title: c.lapsed,
      subtitle: c.lapsedBody,
      unlocked: false,
      action: 'plans',
    };
  if (enforcement && !enforcement.applied)
    return {
      ...model,
      state: 'enforcementFailed',
      icon: 'lock',
      title: c.enforcementFailed,
      subtitle: c.enforcementFailedBody,
      unlocked: false,
      action: 'retry',
    };
  const capability = canEnforce({ screenTime: permissions.screenTime, selection: apps });
  if (!capability.ok && capability.reason === 'screenTimeDenied')
    return {
      ...model,
      state: 'permissionNeeded',
      icon: 'shield',
      title: c.nothingBlocked,
      subtitle: c.permissionBody,
      unlocked: false,
      action: 'permission',
    };
  if (!capability.ok)
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
    // A session that is still verifying has not unlocked anything, and a pending first claim has not
    // been counted yet: the card stays locked, and only its subtitle says what the app is doing.
    const subtitle =
      lastClaimAt === null
        ? c.claimPending
        : walkingSession?.phase === 'verifying'
          ? c.verifying
          : c.until(action);
    return { ...model, title: c.locked, icon: 'lock', unlocked: false, subtitle };
  }
  if (d.state === 'unlockedMet')
    return {
      ...model,
      title: c.met,
      subtitle: caughtUp ? c.caughtUp : d.byName ? c.unlockedBy(d.byName) : resume(d.relockAt),
      nextChange: resume(d.relockAt),
    };
  if (d.state === 'unlockedProvisional') {
    const by = rules.find((rule) => rule.id === d.byRuleId)?.mode;
    const minutes = by?.kind === 'target' && by.metric === 'minutes' ? by.goal : null;
    return {
      ...model,
      title: c.provisional,
      subtitle: minutes === null ? c.gymHold : c.provisionalMinutes(minutes),
      nextChange: resume(d.holdsUntil),
    };
  }
  if (d.state === 'unlockedWalking')
    return { ...model, title: c.walking, subtitle: c.left(leaseClock(d.leaseUntil, now)), action: 'stop' };
  if (d.state === 'beforeWindow')
    return {
      ...model,
      title: c.starts(time(d.nextLockAt)),
      subtitle: d.getAheadRuleId
        ? c.getAhead(ruleName(rules.find((rule) => rule.id === d.getAheadRuleId)!))
        : c.openUntil,
    };
  if (d.state === 'afterWindow') return { ...model, subtitle: resume(d.nextLockAt) };
  if (d.state === 'noRulesToday') return { ...model, subtitle: resume(d.nextLockAt) };
  return model;
}
