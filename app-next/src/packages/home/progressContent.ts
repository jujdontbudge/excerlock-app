import { Rule, RuleDay, Permissions } from '../model/types';
import type { WalkingStatus } from '../ports/WalkingPort';
import { homeCopy as c } from './homeCopy';
import { ruleName } from '../conditions/ruleName';
export function progressContent(
  rule: Rule,
  row: RuleDay,
  permissions: Permissions,
  session: WalkingStatus,
  auto: boolean,
) {
  const m = rule.mode,
    title = ruleName(rule),
    format = (value: number) =>
      value.toLocaleString('en-US');
  if (m.kind === 'bank') return { title, icon: rule.activity, value: 0, detail: 'Buy screen time in the Shop', action: undefined, label: undefined } as const;
  if (m.kind === 'state') {
    const mine = session.ruleId === rule.id ? session : null;
    const live = !!mine && ['active', 'grace'].includes(mine.phase);
    const state = live ? mine!.phase : 'idle';
    return {
      title,
      icon: rule.activity,
      value: live ? 1 : 0,
      detail: rule.activity === 'gym' ? c.gymReady : permissions.motion === 'denied' ? c.walkReadyDenied : c.walkReady,
      action: rule.activity === 'gym' ? 'checkin' : 'walk',
      label: state === 'active' || state === 'grace' ? c.walkDetected : c.walkingEntry,
      state,
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
  const unit = m.metric;
  const permission =
    rule.activity === 'walking'
      ? permissions.motion === 'granted'
      : ['whenInUse', 'always'].includes(permissions.location);
  const needed = rule.activity === 'walking' ? c.motionNeeded : c.locationNeeded;
  return {
    title,
    icon: rule.activity,
    value: row.progress / m.goal,
    detail: permission ? c.progress(format(row.progress), format(m.goal), unit) : needed,
    action: rule.activity === 'gym' && !row.met ? 'checkin' : undefined,
    label: rule.activity === 'gym' && !row.met ? c.checkIn : undefined,
  } as const;
}
