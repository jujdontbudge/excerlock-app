import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Heading, PrimaryButton, ScreenShell, SecondaryButton } from '../src/packages/ui';
import { SignInScreen } from '../src/packages/identity/SignInScreen';
import { useRuntime } from '../src/packages/ports/useRuntime';
import { beginWelcome, useJourney, verifySelectedAccount } from '../src/packages/journey/index';
import { reportRuntimeError } from '../src/packages/telemetry/reportRuntimeError';
export default function SignInRoute() {
  const router = useRouter();
  const runtime = useRuntime();
  const journey = useJourney(runtime);
  const { purpose } = useLocalSearchParams<{ purpose?: string }>();
  const complete = async () => {
    const result = await verifySelectedAccount(runtime);
    if (result === 'paid') router.replace('/setup/X1');
    else if (result === 'unpaid') router.replace('/paywall');
  };
  const exit = () => { beginWelcome(); router.replace('/onboarding/O01'); };
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
          />
        )}
      </ScreenShell>
    </SafeAreaProvider>
  );
}
