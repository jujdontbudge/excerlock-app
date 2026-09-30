import { useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Heading, Label, PrimaryButton, ScreenShell, SecondaryButton } from '../src/packages/ui';
import { SignInScreen } from '../src/packages/identity/SignInScreen';
import { useRuntime } from '../src/packages/ports/useRuntime';
import { beginWelcome, useJourney, verifySelectedAccount } from '../src/packages/journey/index';
export default function SignInRoute() {
  const router = useRouter();
  const runtime = useRuntime();
  const journey = useJourney(runtime);
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
          <>
            <Heading title="Checking your subscription" />
            <Label>{journey.error ?? 'Connecting your subscription to your account…'}</Label>
            {journey.error ? <PrimaryButton label="Retry" onPress={() => void complete()} /> : null}
            {journey.error ? <SecondaryButton label="Account and help" onPress={() => router.push('/recovery')} /> : null}
            <SecondaryButton label="Back to start" onPress={exit} />
          </>
        ) : (
          <SignInScreen onContinue={() => void complete()} onExit={exit} signInRequired={true} requireFreshSignIn />
        )}
      </ScreenShell>
    </SafeAreaProvider>
  );
}
