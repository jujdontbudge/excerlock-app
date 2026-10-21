import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Heading, PrimaryButton, ScreenShell, SecondaryButton } from '../src/packages/ui';
import { SignInScreen, signInRecoveryCopy } from '../src/packages/identity/SignInScreen';
import { useRuntime } from '../src/packages/ports/useRuntime';
import { beginOnboarding, beginWelcome, useJourney, verifySelectedAccount } from '../src/packages/journey/index';
import { reportRuntimeError } from '../src/packages/telemetry/reportRuntimeError';
export default function SignInRoute() {
  const router = useRouter();
  const runtime = useRuntime();
  const journey = useJourney(runtime);
  const [retrying, setRetrying] = useState(false);
  const retryInFlight = useRef(false);
  const { purpose, from } = useLocalSearchParams<{ purpose?: string; from?: string }>();
  const fromWelcome = from === 'welcome';
  const complete = async () => {
    const result = await verifySelectedAccount(runtime);
    if (result === 'paid') router.replace('/setup/X1');
    else if (result === 'unpaid') router.replace('/paywall');
  };
  const retry = async () => {
    if (retryInFlight.current) return;
    retryInFlight.current = true;
    setRetrying(true);
    try { await complete(); } finally { retryInFlight.current = false; setRetrying(false); }
  };
  const exit = () => {
    beginWelcome();
    router.replace('/onboarding/O01');
  };
  const createAccount = () => {
    beginWelcome();
    beginOnboarding();
    router.replace('/onboarding/O04');
  };
  return (
    <SafeAreaProvider>
      <ScreenShell>
        {journey.phase === 'verifying' && (journey.error || retrying) ? (
            <>
              <Heading title={signInRecoveryCopy.title} support={runtime.subscription.recovery().type !== 'none' ? signInRecoveryCopy.purchase : undefined} centered />
              <PrimaryButton label="Try again" loading={retrying} onPress={() => void retry()} />
              <SecondaryButton label="Account and help" loading={retrying} onPress={() => router.push('/recovery')} />
              <SecondaryButton label="Back to start" loading={retrying} onPress={exit} />
            </>
        ) : (
          <SignInScreen
            purpose={purpose === 'signIn' ? 'signIn' : 'signUp'}
            reportError={reportRuntimeError}
            onContinue={complete}
            onExit={exit}
            signInRequired={true}
            requireFreshSignIn
            firstVisit={fromWelcome}
            onCreateAccount={purpose === 'signIn' ? createAccount : undefined}
          />
        )}
      </ScreenShell>
    </SafeAreaProvider>
  );
}
