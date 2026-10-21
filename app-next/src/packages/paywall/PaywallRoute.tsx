import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'expo-router';
import { currentJourney, refreshAdmission, useJourney } from '../journey/index';
import { openOnboardingPaywall } from '../onboarding/resumeOnboarding';
import { useRuntime } from '../ports/useRuntime';
import { subscriptionCopy } from '../subscription/subscriptionCopy';
import { notify } from '../ui/Notice';
import { PaywallSlot } from './PaywallSlot';
import { PaywallScreen } from './lib/PaywallScreen';
import { reportPaywallError, type PaywallErrorOperation } from './lib/paywallErrors';

export function PaywallRoute() {
  const runtime = useRuntime();
  const journey = useJourney(runtime);
  useEffect(() => {
    const phase = currentJourney().phase;
    if (phase === 'welcome' || phase === 'onboarding') openOnboardingPaywall();
  }, []);
  return journey.paid && (journey.phase === 'app' || journey.phase === 'setup') ? <InAppPaywall /> : <PaywallSlot />;
}

function InAppPaywall() {
  const runtime = useRuntime();
  const router = useRouter();
  const retryInFlight = useRef(false);
  const [retrying, setRetrying] = useState(false);
  const recovery = useSyncExternalStore(
    (listener) => runtime.subscription.subscribeRecovery(listener),
    () => runtime.subscription.recovery(),
    () => runtime.subscription.recovery(),
  );
  const close = () => {
    if (retryInFlight.current || runtime.subscription.operation().busy) return;
    if (router.canGoBack()) router.back();
    else router.replace(currentJourney().phase === 'setup' ? '/setup/X1' : '/(tabs)/settings');
  };
  const reportError = useCallback(
    (error: unknown, operation: PaywallErrorOperation) => reportPaywallError(runtime, error, operation),
    [runtime],
  );
  const access = async () => {
    if (retryInFlight.current) return;
    retryInFlight.current = true;
    setRetrying(true);
    let verified = false;
    try {
      const selected = runtime.auth.identity();
      const result = await refreshAdmission(runtime);
      const live = runtime.auth.identity();
      const pending = runtime.subscription.recovery();
      if (result === 'paid' && selected.userId && selected.userId === live.userId && selected.generation === live.generation &&
        pending.type !== 'pending' && (pending.type === 'none' || pending.checkoutUserId === selected.userId)) {
        await runtime.subscription.clearRecovery();
        verified = true;
      } else notify(subscriptionCopy.error);
    } catch (error) {
      reportError(error, 'restore');
      notify(subscriptionCopy.error);
    } finally {
      retryInFlight.current = false;
      setRetrying(false);
    }
    if (verified) close();
  };
  return <PaywallScreen placement="in_app" reportError={reportError} recovery={recovery} onClose={close} onAccess={() => void access()} verifying={retrying} />;
}
