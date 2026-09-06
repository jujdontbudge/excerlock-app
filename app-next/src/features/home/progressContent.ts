import { Rule, RuleDay, Permissions, WalkingSession } from '../../domain/types';
import { homeCopy as c } from '../../content/home';
import { ruleName } from '../../domain/ruleName';
import { leaseClock } from './statusContent';
export function progressContent(
  rule: Rule,
  row: RuleDay,
  permissions: Permissions,
  session: WalkingSession | null,
  now: string,
  auto: boolean,
) {
  const m = rule.mode,
    title = ruleName(rule),
    format = (value: number) =>
      value.toLocaleString('en-US', { maximumFractionDigits: m.kind === 'target' && m.metric === 'distance' ? 1 : 0 });
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
      action: live ? 'stop' : 'walk',
      label: live ? c.stopWalk : c.startWalk,
    } as const;
  }
  if (m.kind === 'event')
    return {
      title,
      icon: rule.activity,
      value: row.met ? 1 : 0,
      detail: `${row.met ? c.checkedIn : c.awaitingGym} · ${auto ? c.autoOn : c.autoOff}`,
      action: row.met ? undefined : 'checkin',
      label: row.met ? undefined : c.checkIn,
    } as const;
  const unit = m.metric === 'distance' ? m.unit : m.metric;
  const permission =
    rule.activity === 'walking'
      ? permissions.motion === 'granted'
      : rule.activity === 'gym'
        ? ['whenInUse', 'always'].includes(permissions.location)
        : permissions.health === 'granted';
  const needed =
    rule.activity === 'walking' ? c.motionNeeded : rule.activity === 'gym' ? c.locationNeeded : c.healthNeeded;
  return {
    title,
    icon: rule.activity,
    value: row.progress / m.goal,
    detail: permission ? c.progress(format(row.progress), format(m.goal), unit) : needed,
  } as const;
}
