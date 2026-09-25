import type { LockedApps, Permissions, Rule } from '../model/types';

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

export function locationNeed(rules: Rule[]): 'always' | 'whenInUse' | null {
  const enabled = rules.filter((rule) => rule.enabled);
  if (enabled.some((rule) => rule.mode.kind === 'state' && rule.activity === 'walking')) return 'always';
  return enabled.some((rule) => rule.activity === 'gym') ? 'whenInUse' : null;
}

export function needBlocked(need: SetupNeed, p: Permissions) {
  if (need === 'apps') return p.screenTime === 'denied' || p.screenTime === 'restricted';
  if (need === 'motion') return p.motion === 'denied' || p.motion === 'restricted';
  return need === 'location' && p.location === 'denied';
}
