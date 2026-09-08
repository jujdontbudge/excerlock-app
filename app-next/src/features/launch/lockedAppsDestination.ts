import { Entitlement } from '../../domain/types';
/**
 * Where the shield's "locked apps" notification lands. The route itself sits outside every guard so
 * the deep link always resolves; this rule decides what the user actually sees.
 */
export function lockedAppsDestination(status: Entitlement['status']): string | null {
  if (status === 'unknown') return null;
  return status === 'trial' || status === 'active' ? '/(tabs)/home' : '/paywall';
}
