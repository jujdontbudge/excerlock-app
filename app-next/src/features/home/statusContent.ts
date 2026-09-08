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
  action?: 'permission' | 'apps' | 'add' | 'conditions' | 'stop' | 'retry';
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
};
export function leaseClock(until: string, now: string) {
  const seconds = Math.max(0, Math.ceil((Date.parse(until) - Date.parse(now)) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function statusContent({ decision: d, rules, permissions, apps, now, timezone, enforcement }: Input): StatusModel {
  const time = (at: string) =>
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone })
      .format(new Date(at))
      .replace(/\s(?=[AP]M$)/, '\u00a0');
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
  if (!rules.length) return { ...model, state: 'noRules', title: c.noRules, subtitle: c.emptyBody, action: 'add' };
  if (rules.every((r) => !r.enabled))
    return { ...model, state: 'allPaused', title: c.paused, subtitle: c.resume, action: 'conditions' };
  const capability = canEnforce({ screenTime: permissions.screenTime, selection: apps });
  if (!capability.ok && capability.reason === 'screenTimeDenied')
    return { ...model, state: 'permissionNeeded', subtitle: c.permission, action: 'permission' };
  if (!capability.ok) return { ...model, state: 'noAppsSelected', subtitle: c.noApps, action: 'apps' };
  if (enforcement && !enforcement.applied)
    return {
      ...model,
      state: 'enforcementFailed',
      title: c.enforcementFailed,
      subtitle: c.enforcementFailedBody,
      action: 'retry',
    };
  if (d.state === 'locked') {
    const hint = d.nextUnlockHint,
      rule = rules.find((r) => r.id === hint.ruleId);
    const action =
      hint.action === 'walk'
        ? c.walk
        : hint.action === 'arrive'
          ? c.arrive
          : `${domainCopy.verbs[rule?.activity ?? 'walking'].toLowerCase()} ${hint.remaining?.toLocaleString('en-US')} ${hint.unit}`;
    return { ...model, title: c.locked, icon: 'lock', unlocked: false, subtitle: c.until(action) };
  }
  if (d.state === 'unlockedMet') return { ...model, title: c.met, subtitle: resume(d.relockAt) };
  if (d.state === 'unlockedProvisional') return { ...model, title: c.atGym, subtitle: c.gymHold };
  if (d.state === 'unlockedWalking')
    return { ...model, title: c.walking, subtitle: c.left(leaseClock(d.leaseUntil, now)), action: 'stop' };
  if (d.state === 'beforeWindow')
    return {
      ...model,
      title: c.starts(time(d.nextLockAt)),
      subtitle: d.getAheadRuleId
        ? c.getAhead(ruleName(rules.find((rule) => rule.id === d.getAheadRuleId)!))
        : c.walkReady,
    };
  if (d.state === 'afterWindow') return { ...model, subtitle: resume(d.nextLockAt) };
  if (d.state === 'noRulesToday') return { ...model, subtitle: resume(d.nextLockAt) };
  return model;
}
