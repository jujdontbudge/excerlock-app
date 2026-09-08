import type { ComponentType, ReactNode } from 'react';
import { RootNavigator } from '../src/features/launch/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppRuntimeProvider } from '../src/runtime/AppRuntimeProvider';
// Background task definitions must be registered from the application entry
// bundle, before any task can fire. Side-effect import on purpose.
import '../src/engine/signals/location/registerLocationTasks';
export { RouteErrorBoundary as ErrorBoundary } from '../src/features/launch/AppErrorBoundary';
export default function RootLayout() {
  const productRuntime = <ProductRuntime />;
  // A test-harness build lands on the harness, never on the product. The
  // require is inside the branch so a shipped bundle never pulls it in.
  if (process.env.EXPO_PUBLIC_TEST_HARNESS === '1') {
    const { HarnessBuildRoot } = require('../src/harness/HarnessBuildRoot') as {
      HarnessBuildRoot: ComponentType<{ productRuntime: ReactNode }>;
    };
    return <HarnessBuildRoot productRuntime={productRuntime} />;
  }
  return productRuntime;
}
function ProductRuntime() {
  return (
    <GestureHandlerRootView>
      <SafeAreaProvider>
        <AppRuntimeProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AppRuntimeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
