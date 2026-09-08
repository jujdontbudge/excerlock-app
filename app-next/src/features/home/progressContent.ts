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
    const mine = session?.ruleId === rule.id;
    const live = mine && ['walking', 'grace'].includes(session.phase) && Date.parse(session.leaseUntil) > Date.parse(now);
    // A handheld hand-off leaves the session verifying: say so rather than
    // inviting a walk that is already under way.
    const verifying = mine && session.phase === 'verifying';
    return {
      title,
      icon: rule.activity,
      value: live ? 1 : 0,
      detail: live ? c.left(leaseClock(session.leaseUntil, now)) : verifying ? c.verifying : c.walkReady,
      action: 'walk',
      label: live || verifying ? c.viewWalk : c.startWalk,
    } as const;
  }
  if (m.kind === 'event')
    return {
      title,
      icon: rule.activity,
      value: row.met ? 1 : 0,
      detail: `${row.met ? c.checkedIn : c.awaitingGym} · ${auto ? c.autoOn : c.autoOff}`,
      action: undefined,
      label: row.met ? undefined : c.gymEntry,
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
  // A gym card leads into the arrival ceremony rather than an in-place check-in.
  const gymEntry = rule.activity === 'gym' && !row.met;
  // Neither Health nor the DeviceActivity extension can post a finished run in the background, so a
  // card with no action tells the user that opening the app is what claims the goal (B8, B11).
  const claimOnOpen = !gymEntry && !row.met && (rule.activity === 'running' || rule.activity === 'biking');
  const measured = c.progress(format(row.progress), format(m.goal), unit);
  return {
    title,
    icon: rule.activity,
    value: row.progress / m.goal,
    detail: permission ? (claimOnOpen ? `${measured} · ${c.claimOnOpen}` : measured) : needed,
    action: undefined,
    label: gymEntry ? c.gymEntry : undefined,
  } as const;
}
