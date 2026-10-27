import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ScreenShell } from '../src/packages/ui';
import { SignInScreen } from '../src/packages/identity/SignInScreen';
import { useRuntime } from '../src/packages/ports/useRuntime';
import { admitPaid, beginOnboarding, beginPaywall, beginWelcome } from '../src/packages/journey/index';
import { onboardingStore } from '../src/packages/onboarding/onboardingStore';
import { reportRuntimeError } from '../src/packages/telemetry/reportRuntimeError';
export default function SignInRoute() {
  const router = useRouter();
  const runtime = useRuntime();
  const { purpose, from } = useLocalSearchParams<{ purpose?: string; from?: string }>();
  const fromWelcome = from === 'welcome';
  const complete = async () => {
    await runtime.subscription.refresh().catch(reportRuntimeError);
    const { setupComplete } = onboardingStore.getState().data;
    if (admitPaid(runtime, setupComplete)) router.replace(setupComplete ? '/(tabs)/home' : '/setup/X1');
    else {
      beginPaywall();
      router.replace('/paywall');
    }
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
        <SignInScreen
          purpose={purpose === 'signIn' ? 'signIn' : 'signUp'}
          reportError={reportRuntimeError}
          onContinue={complete}
          onExit={exit}
          firstVisit={fromWelcome}
          onCreateAccount={purpose === 'signIn' ? createAccount : undefined}
        />
      </ScreenShell>
    </SafeAreaProvider>
  );
}
