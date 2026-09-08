import { Rule, RuleDay, Permissions, WalkingSession } from '../../domain/types';
import { homeCopy as c } from '../../content/home';
import { ruleName } from '../../domain/ruleName';
import { leaseClock } from './statusContent';
export type ProgressModel = {
  title: string;
  icon: Rule['activity'];
  value: number;
  detail: string;
  action?: 'walk' | 'checkin' | 'fix';
  label?: string;
};
/** The sensor a rule's progress depends on — the permission its Fix action opens. */
export function sensorFor(rule: Rule): 'motion' | 'location' | 'health' {
  return rule.activity === 'walking' ? 'motion' : rule.activity === 'gym' ? 'location' : 'health';
}
export function progressContent(
  rule: Rule,
  row: RuleDay,
  permissions: Permissions,
  session: WalkingSession | null,
  now: string,
  auto: boolean,
  satisfiedBy?: { byRuleId: string; byRuleName: string },
): ProgressModel {
  const m = rule.mode,
    title = ruleName(rule),
    format = (value: number) =>
      value.toLocaleString('en-US', { maximumFractionDigits: m.kind === 'target' && m.metric === 'distance' ? 1 : 0 });
  if (satisfiedBy && satisfiedBy.byRuleId !== rule.id)
    return { title, icon: rule.activity, value: row.met ? 1 : 0, detail: c.satisfied(satisfiedBy.byRuleName) };
  const sensor = sensorFor(rule);
  const permission =
    sensor === 'location' ? ['whenInUse', 'always'].includes(permissions.location) : permissions[sensor] === 'granted';
  const needed =
    sensor === 'motion' ? c.motionNeeded : sensor === 'location' ? c.locationNeeded : c.healthNeeded;
  if (!permission)
    return {
      title,
      icon: rule.activity,
      value: m.kind === 'target' ? row.progress / m.goal : row.met ? 1 : 0,
      detail: needed,
      action: 'fix',
      label: c.sensorFix,
    };
  if (m.kind === 'state') {
    const live =
      session?.ruleId === rule.id &&
      ['walking', 'grace'].includes(session.phase) &&
      Date.parse(session.leaseUntil) > Date.parse(now);
    return {
      title,
      icon: rule.activity,
      value: live ? 1 : 0,
      detail: live ? c.left(leaseClock(session.leaseUntil, now)) : c.walkReady,
      action: 'walk',
      label: live ? c.viewWalk : c.startWalk,
    };
  }
  if (m.kind === 'event')
    return {
      title,
      icon: rule.activity,
      value: row.met ? 1 : 0,
      detail: `${row.met ? c.checkedIn : c.awaitingGym} · ${auto ? c.autoOn : c.autoOff}`,
      action: row.met ? undefined : 'checkin',
      label: row.met ? undefined : c.checkIn,
    };
  const unit = m.metric === 'distance' ? m.unit : m.metric;
  return {
    title,
    icon: rule.activity,
    value: row.progress / m.goal,
    detail: c.progress(format(row.progress), format(m.goal), unit),
    action: rule.activity === 'gym' && !row.met ? 'checkin' : undefined,
    label: rule.activity === 'gym' && !row.met ? c.checkIn : undefined,
  };
}
