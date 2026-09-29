import { useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ScreenShell } from '../src/packages/ui';
import { SignInScreen } from '../src/packages/identity/SignInScreen';
import { useSignInRequiredSource } from '../src/packages/identity/useSignInRequiredSource';
import { useLaunchSignIn } from '../src/packages/identity/launchSignInGate';
import { useRuntime } from '../src/packages/ports/useRuntime';
export default function SignInRoute() {
  const r = useRouter();
  const signInRequired = useSignInRequiredSource();
  const launchApproved = useLaunchSignIn(useRuntime().auth);
  return (
    <SafeAreaProvider>
      <ScreenShell>
        <SignInScreen
          onContinue={() => launchApproved ? r.back() : r.replace('/(tabs)/home')}
          onExit={launchApproved ? () => r.back() : undefined}
          signInRequired={launchApproved ? signInRequired : true}
          requireFreshSignIn={!launchApproved}
        />
      </ScreenShell>
    </SafeAreaProvider>
  );
}
