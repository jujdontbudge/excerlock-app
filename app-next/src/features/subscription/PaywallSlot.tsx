import { useEffect } from 'react';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { PaywallScreen } from './PaywallScreen';
export function PaywallSlot() {
  const runtime = useRuntime();
  const setupComplete = useOnboardingStore((state) => state.data.setupComplete);
  useEffect(() => {
    useOnboardingStore.getState().patch({ step: 'P', complete: true });
    runtime.analytics.screen('P');
  }, [runtime]);
  return <PaywallScreen placement={setupComplete ? 'in_app' : 'onboarding'} />;
}
