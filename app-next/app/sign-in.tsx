import { useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsPage } from '../src/features/settings/SettingsPage';
import { SignInScreen } from '../src/features/setup/SignInScreen';
import { useSignInRequiredSource } from '../src/features/setup/useSignInRequiredSource';
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
