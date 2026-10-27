import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ScreenShell } from '../src/packages/ui';
import { SignInScreen } from '../src/packages/identity/SignInScreen';
import { useRuntime } from '../src/packages/ports/useRuntime';
import { admitPaid, beginPaywall, beginWelcome } from '../src/packages/journey/index';
import { onboardingStore } from '../src/packages/onboarding/onboardingStore';
import { reportRuntimeError } from '../src/packages/telemetry/reportRuntimeError';
export default function SignInRoute() {
  const router = useRouter();
  const runtime = useRuntime();
  const { purpose } = useLocalSearchParams<{ purpose?: string }>();
  const saving = purpose === 'save';
  const complete = async () => {
    await runtime.subscription.refresh().catch(reportRuntimeError);
    if (saving && router.canGoBack()) {
      router.back();
      return;
    }
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
  return (
    <SafeAreaProvider>
      <ScreenShell>
        <SignInScreen
          purpose={saving ? 'save' : 'signIn'}
          reportError={reportRuntimeError}
          onContinue={complete}
          onExit={saving ? () => void complete() : exit}
        />
      </ScreenShell>
    </SafeAreaProvider>
  );
}
