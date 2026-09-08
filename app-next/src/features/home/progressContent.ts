import { Rule, RuleDay, Permissions, WalkingSession } from '../../domain/types';
import { homeCopy as c } from '../../content/home';
import { unlockCopy } from '../../content/unlock';
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
    // A propped lease has no continuous signal to renew it, so its lapse is a prompt, not a silent relock.
    const rescan =
      !live &&
      m.place !== 'outside' &&
      session?.ruleId === rule.id &&
      session.placement === 'propped' &&
      session.endReason === 'leaseLapsed';
    return {
      title,
      icon: rule.activity,
      value: live ? 1 : 0,
      detail: live ? c.left(leaseClock(session.leaseUntil, now)) : rescan ? unlockCopy.scanAgain : c.walkReady,
      action: 'walk',
      label: live ? c.viewWalk : c.startWalk,
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
    action: rule.activity === 'gym' && !row.met ? 'checkin' : undefined,
    label: rule.activity === 'gym' && !row.met ? c.checkIn : undefined,
  } as const;
}
