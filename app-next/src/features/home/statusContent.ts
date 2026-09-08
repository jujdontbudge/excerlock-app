import { LockDecision, LockedApps, Permissions, Rule } from '../../domain/types';
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
  /** When the next lock or unlock happens, shown under the lock card while the headline names the cause. */
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
  /** The subscription lapsed, so the apps are open for billing reasons rather than for the day. */
  lapsed?: boolean;
  // merge: P2-T05's progressSync owns both of these; Home passes the launch claim it can see today.
  lastClaimAt?: string | null;
  caughtUp?: boolean;
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
  lapsed,
  lastClaimAt,
  caughtUp,
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
  // The chain is order-sensitive: a lapse and a failed apply outrank every ordinary Home state, and
  // "nothing is being blocked" outranks the rest-day copy so a denial never reads as a free day.
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
    return {
      ...model,
      title: c.blockedHeadline,
      icon: 'lock',
      unlocked: false,
      subtitle: lastClaimAt === null ? c.claimPending : c.until(action),
    };
  }
  if (d.state === 'unlockedMet')
    return {
      ...model,
      title: c.met,
      subtitle: caughtUp ? c.caughtUp : c.unlockedBy(d.byName),
      nextChange: resume(d.relockAt),
    };
  if (d.state === 'unlockedProvisional') {
    // A minutes goal counts the whole day once it is reached; a gym arrival only holds while presence does.
    const mode = rules.find((rule) => rule.id === d.byRuleId)?.mode;
    return mode?.kind === 'target' && mode.metric === 'minutes'
      ? { ...model, title: c.provisional, subtitle: c.provisionalMinutes(mode.goal) }
      : { ...model, title: c.atGym, subtitle: c.gymHold };
  }
  if (d.state === 'unlockedWalking')
    return { ...model, title: c.walking, subtitle: c.left(leaseClock(d.leaseUntil, now)), action: 'stop' };
  if (d.state === 'beforeWindow') {
    const ahead = d.getAheadRuleId ? rules.find((r) => r.id === d.getAheadRuleId) : undefined;
    return {
      ...model,
      title: c.starts(time(d.nextLockAt)),
      subtitle: ahead ? c.getAhead(ruleName(ahead)) : c.openUntil,
    };
  }
  if (d.state === 'afterWindow') return { ...model, subtitle: resume(d.nextLockAt) };
  if (d.state === 'noRulesToday') return { ...model, subtitle: resume(d.nextLockAt) };
  return model;
}
