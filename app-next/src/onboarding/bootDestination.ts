import { Entitlement } from '../domain/types';
export function bootDestination(
  complete: boolean,
  step: string,
  entitlement: Entitlement['status'],
  setupComplete = true,
  setupStep = 'X1',
): string | null {
  if (entitlement === 'unknown') return null;
  if (entitlement === 'trial' || entitlement === 'active')
    return setupComplete ? '/(tabs)/home' : `/setup/${setupStep}`;
  if (!complete) return step === 'P' ? '/paywall' : `/onboarding/${step}`;
  return '/paywall';
}
