import type { Permissions } from './types';

export type BackgroundWalkingGrant = 'motion' | 'location';
/**
 * Whether a walk can unlock apps with ExcerLock in the background. Live Core
 * Motion stops the moment iOS suspends the app, and only the Always-location
 * keep-alive (`AwakeSession`) keeps the process resident through a lock window,
 * so hands-free unlock needs Motion & Fitness AND Always location. `ask` lists
 * the grants a system prompt can still obtain (When In Use counts: iOS offers
 * the Always upgrade once); `settings` lists grants only iOS Settings can repair.
 */
export type BackgroundWalkingReadiness =
  | { state: 'ready' }
  | { state: 'ask'; missing: BackgroundWalkingGrant[] }
  | { state: 'settings'; blocked: BackgroundWalkingGrant[] };

export function backgroundWalkingReadiness(permissions: Permissions): BackgroundWalkingReadiness {
  const blocked: BackgroundWalkingGrant[] = [];
  if (permissions.motion === 'denied' || permissions.motion === 'restricted') blocked.push('motion');
  if (permissions.location === 'denied') blocked.push('location');
  if (blocked.length) return { state: 'settings', blocked };
  const missing: BackgroundWalkingGrant[] = [];
  if (permissions.motion !== 'granted') missing.push('motion');
  if (permissions.location !== 'always') missing.push('location');
  return missing.length ? { state: 'ask', missing } : { state: 'ready' };
}
