import { useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsPage } from '../src/packages/ui/SettingsPage';
import { SignInScreen } from '../src/packages/identity/SignInScreen';
import { useSignInRequiredSource } from '../src/packages/identity/useSignInRequiredSource';
export default function SignInRoute() {
  const r = useRouter();
  const signInRequired = useSignInRequiredSource();
  return (
    <SafeAreaProvider>
      <SettingsPage onBack={() => r.back()}>
        <SignInScreen onContinue={() => r.back()} signInRequired={signInRequired} />
      </SettingsPage>
    </SafeAreaProvider>
  );
}
