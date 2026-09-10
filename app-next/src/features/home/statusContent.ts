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
  action?: 'permission' | 'apps' | 'add' | 'conditions' | 'stop';
};
type Input = {
  decision: LockDecision;
  rules: Rule[];
  permissions: Permissions;
  apps: LockedApps;
  now: string;
  timezone: string;
};
export function leaseClock(until: string, now: string) {
  const seconds = Math.max(0, Math.ceil((Date.parse(until) - Date.parse(now)) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function statusContent({ decision: d, rules, permissions, apps, now, timezone }: Input): StatusModel {
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
  if (!rules.length) return { ...model, state: 'noRules', title: c.noRules, subtitle: c.emptyBody, action: 'add' };
  if (rules.every((r) => !r.enabled))
    return { ...model, state: 'allPaused', title: c.paused, subtitle: c.resume, action: 'conditions' };
  if (permissions.screenTime !== 'granted')
    return { ...model, state: 'permissionNeeded', subtitle: c.permission, action: 'permission' };
  if (apps.isEmpty)
    return { ...model, state: 'noAppsSelected', subtitle: c.noApps, action: 'apps' };
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
  if (d.state === 'unlockedAtGym')
    return {
      ...model,
      title: c.atGym,
      subtitle: rules.find((r) => r.id === d.ruleId)?.mode.kind === 'target' ? c.atGymTime : c.atGymBody,
    };
  if (d.state === 'unlockedWalking')
    return { ...model, title: c.walking, subtitle: c.left(leaseClock(d.leaseUntil, now)), action: 'stop' };
  if (d.state === 'beforeWindow')
    return {
      ...model,
      title: c.starts(time(d.nextLockAt)),
      subtitle: c.getAhead(ruleName(rules.find((r) => r.id === d.ruleId)!)),
    };
  if (d.state === 'afterWindow') return { ...model, subtitle: resume(d.nextLockAt) };
  return model;
}
