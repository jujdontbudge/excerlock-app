import { Entitlement } from '../domain/types';
import { entitlementAccess } from '../domain/entitlementAccess';
export function bootDestination(
  complete: boolean,
  step: string,
  entitlement: Entitlement['status'],
  setupComplete = true,
  setupStep = 'X1',
): string | null {
  if (entitlement === 'unknown') return null;
  if (entitlementAccess(entitlement).appAccess)
    return setupComplete ? '/(tabs)/home' : `/setup/${setupStep}`;
  if (!complete) return step === 'P' ? '/paywall' : `/onboarding/${step}`;
  return '/paywall';
}
