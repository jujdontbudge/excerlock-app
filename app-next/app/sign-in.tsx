import { useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ScreenShell } from '../src/packages/ui';
import { SignInScreen } from '../src/packages/identity/SignInScreen';
import { useSignInRequiredSource } from '../src/packages/identity/useSignInRequiredSource';
export default function SignInRoute() {
  const r = useRouter();
  const signInRequired = useSignInRequiredSource();
  return (
    <SafeAreaProvider>
      <ScreenShell>
        <SignInScreen onContinue={() => r.back()} onExit={() => r.back()} signInRequired={signInRequired} />
      </ScreenShell>
    </SafeAreaProvider>
  );
}
