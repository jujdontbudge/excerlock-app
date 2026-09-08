import { RootNavigator } from '../src/features/launch/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppRuntimeProvider } from '../src/runtime/AppRuntimeProvider';
export { RouteErrorBoundary as ErrorBoundary } from '../src/features/launch/AppErrorBoundary';
export default function RootLayout() {
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
