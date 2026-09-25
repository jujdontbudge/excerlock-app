import { Entitlement } from '../../model/types';
export function bootDestination(
  complete: boolean,
  step: string,
  entitlement: Entitlement['status'],
  setupComplete = true,
): string | null {
  if (complete && setupComplete) return '/(tabs)/home';
  if (entitlement === 'unknown') return null;
  if (entitlement === 'trial' || entitlement === 'active') return setupComplete ? '/(tabs)/home' : '/setup/X1';
  if (!complete) return step === 'P' ? '/paywall' : `/onboarding/${step}`;
  return '/paywall';
}
