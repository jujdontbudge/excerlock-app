import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Heading, PrimaryButton, ScreenShell, SecondaryButton } from '../src/packages/ui';
import { SignInScreen } from '../src/packages/identity/SignInScreen';
import { useRuntime } from '../src/packages/ports/useRuntime';
import { beginOnboarding, beginWelcome, useJourney, verifySelectedAccount } from '../src/packages/journey/index';
import { reportRuntimeError } from '../src/packages/telemetry/reportRuntimeError';
export default function SignInRoute() {
  const router = useRouter();
  const runtime = useRuntime();
  const journey = useJourney(runtime);
  const { purpose, from } = useLocalSearchParams<{ purpose?: string; from?: string }>();
  const fromWelcome = from === 'welcome';
  const complete = async () => {
    const result = await verifySelectedAccount(runtime);
    if (result === 'paid') router.replace('/setup/X1');
    else if (result === 'unpaid') router.replace('/paywall');
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
        {journey.phase === 'verifying' ? (
          journey.error ? (
            <>
              <Heading title="Let's try that again" centered />
              <PrimaryButton label="Try again" onPress={() => void complete()} />
              <SecondaryButton label="Account and help" onPress={() => router.push('/recovery')} />
              <SecondaryButton label="Back to start" onPress={exit} />
            </>
          ) : null
        ) : (
          <SignInScreen
            purpose={purpose === 'signIn' ? 'signIn' : 'signUp'}
            reportError={reportRuntimeError}
            onContinue={() => void complete()}
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
