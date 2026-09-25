import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SetupFlow } from '../../src/features/setup/SetupFlow';
export default function PermissionsRoute() {
  const router = useRouter(),
    { step } = useLocalSearchParams<{ step?: string }>();
  const leave = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home')), [router]);
  return (
    <SafeAreaProvider>
      <SetupFlow
        account={false}
        onDone={leave}
        onClose={leave}
        onStep={(next) => {
          if (next !== step) router.setParams({ step: next });
        }}
      />
    </SafeAreaProvider>
  );
}
