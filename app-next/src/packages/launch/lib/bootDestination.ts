import type { JourneyState } from '../../journey/index';

export function bootDestination(phase: JourneyState['phase'], step: string, canEnterApp: boolean): string {
  if (phase === 'welcome') return '/onboarding/O01';
  if (phase === 'onboarding') return `/onboarding/${step === 'P' ? 'O01' : step}`;
  if (phase === 'paywall' || phase === 'pendingPurchase' || phase === 'accountRecovery') return '/paywall';
  if (phase === 'signIn' || phase === 'verifying') return '/sign-in';
  if (phase === 'setup') return '/setup/X1';
  return canEnterApp ? '/(tabs)/home' : '/paywall';
}
