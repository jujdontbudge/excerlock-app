import type { LockedApps, Permissions, Rule } from './types';

/**
 * What the enabled conditions still need before ExcerLock can do its job, in the order the setup
 * screens ask for it. Every condition locks apps (Screen Time plus a chosen app list). Walking
 * counts with Motion & Fitness, and a walk that opens apps while ExcerLock is closed also needs
 * Always location to keep the app awake (ADR 0036, ADR 0040). A gym needs location while using
 * the app and a saved gym. One rule feeds the post-paywall screens, Home's reminder card and the
 * ask after a condition is added (ADR 0043).
 */
export type SetupNeed = 'apps' | 'motion' | 'location' | 'gym';

export function setupNeeds({
  rules,
  permissions: p,
  apps,
  gyms,
}: {
  rules: Rule[];
  permissions: Permissions;
  apps: LockedApps;
  gyms: number;
}): SetupNeed[] {
  const enabled = rules.filter((rule) => rule.enabled),
    walking = enabled.some((rule) => rule.activity === 'walking'),
    gym = enabled.some((rule) => rule.activity === 'gym'),
    location = locationNeed(enabled);
  const needs: SetupNeed[] = [];
  if (enabled.length && (p.screenTime !== 'granted' || apps.isEmpty)) needs.push('apps');
  if (walking && p.motion !== 'granted') needs.push('motion');
  if (location === 'always' ? p.location !== 'always' : location === 'whenInUse' && !['whenInUse', 'always'].includes(p.location))
    needs.push('location');
  if (gym && gyms === 0) needs.push('gym');
  return needs;
}

/** The location grant the enabled conditions need; walking detection in the background needs Always. */
export function locationNeed(rules: Rule[]): 'always' | 'whenInUse' | null {
  const enabled = rules.filter((rule) => rule.enabled);
  if (enabled.some((rule) => rule.mode.kind === 'state' && rule.activity === 'walking')) return 'always';
  return enabled.some((rule) => rule.activity === 'gym') ? 'whenInUse' : null;
}

/** iOS never asks twice: once a grant is refused, only Settings can turn it back on. */
export function needBlocked(need: SetupNeed, p: Permissions) {
  if (need === 'apps') return p.screenTime === 'denied' || p.screenTime === 'restricted';
  if (need === 'motion') return p.motion === 'denied' || p.motion === 'restricted';
  return need === 'location' && p.location === 'denied';
}
