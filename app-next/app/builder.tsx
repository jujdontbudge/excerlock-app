import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { permissionsHref } from '../src/packages/permissions/useSetupNeeds';
import { ConditionBuilder } from '../src/packages/editor/ConditionBuilder';
import { useDevProtectedRouteMount } from '../src/packages/launch/DevProtectedRouteMount';
export default function BuilderRoute() {
  useDevProtectedRouteMount();
  const { id } = useLocalSearchParams<{ id?: string }>(),
    router = useRouter();
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView>
        <ConditionBuilder
          key={id ?? 'new'}
          id={id}
          onClose={() => (router.canGoBack() ? router.back() : router.replace('/conditions'))}
          onNeeds={() => router.replace(permissionsHref())}
        />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
