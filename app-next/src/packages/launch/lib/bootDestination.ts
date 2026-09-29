import { Entitlement } from '../../model/types';
export function bootDestination(
  complete: boolean,
  step: string,
  entitlement: Entitlement['status'],
  setupComplete = true,
  launchApproved = false,
): string | null {
  if (complete && setupComplete) return launchApproved ? '/(tabs)/home' : '/sign-in';
  if (entitlement === 'unknown') return null;
  if (entitlement === 'trial' || entitlement === 'active') return setupComplete
    ? launchApproved ? '/(tabs)/home' : '/sign-in'
    : '/setup/X1';
  if (!complete) return step === 'P' ? '/paywall' : `/onboarding/${step}`;
  return '/paywall';
}
