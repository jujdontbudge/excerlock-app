import { Entitlement } from '../domain/types';
export function bootDestination(complete: boolean, step: string, entitlement: Entitlement['status']): string | null {
  if (entitlement === 'unknown') return null;
  if (!complete) return step === 'P' ? '/paywall' : `/onboarding/${step}`;
  return entitlement === 'trial' || entitlement === 'active' ? '/(tabs)/home' : '/paywall';
}
