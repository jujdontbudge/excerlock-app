import { useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsPage } from '../src/features/settings/SettingsPage';
import { SignInScreen } from '../src/features/setup/SignInScreen';
export default function SignInRoute() {
  const r = useRouter();
  return (
    <SafeAreaProvider>
      <SettingsPage onBack={() => r.back()}>
        <SignInScreen onContinue={() => r.back()} />
      </SettingsPage>
    </SafeAreaProvider>
  );
}
