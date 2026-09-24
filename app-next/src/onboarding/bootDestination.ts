import { Entitlement } from '../domain/types';
/**
 * Where launch sends the user. After the paywall come sign-in and the permissions the conditions
 * need (ADR 0043), so an entitled user who has not finished setup resumes there.
 */
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
