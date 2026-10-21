import type { JourneyState } from '../../journey/index';

export function bootDestination(phase: JourneyState['phase'], step: string, canEnterApp: boolean): string {
  if (phase === 'launch' || phase === 'welcome') return '/onboarding/O01';
  if (phase === 'onboarding') return step === 'P' ? '/paywall' : `/onboarding/${step}`;
  if (phase === 'paywall' || phase === 'pendingPurchase' || phase === 'accountRecovery') return '/paywall';
  if (phase === 'signIn' || phase === 'verifying') return '/sign-in';
  if (phase === 'setup') return '/setup/X1';
  return canEnterApp ? '/(tabs)/home' : '/paywall';
}
