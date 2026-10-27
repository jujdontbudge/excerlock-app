import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SetupFlow } from '../../src/packages/setup/SetupFlow';
import { useDevProtectedRouteMount } from '../../src/packages/launch/DevProtectedRouteMount';
export default function PermissionsRoute() {
  useDevProtectedRouteMount();
  const router = useRouter(),
    { step } = useLocalSearchParams<{ step?: string }>();
  const leave = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home')), [router]);
  return (
    <SafeAreaProvider>
      <SetupFlow
        onDone={leave}
        onClose={leave}
        onStep={(next) => {
          if (next !== step) router.setParams({ step: next });
        }}
      />
    </SafeAreaProvider>
  );
}
