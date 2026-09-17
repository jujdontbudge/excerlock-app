import { useEffect } from 'react';
import { RootNavigator } from '../src/features/launch/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppRuntimeProvider } from '../src/runtime/AppRuntimeProvider';
import { markStartupStage } from '../modules/excerlock-startup';
export default function RootLayout() {
  // Diagnostic stage boundary. The runtime only starts after this commit, so
  // the mark always precedes HydrationDone/BootGateRedirect; the native
  // RCTContentDidAppearNotification usually wins the same stage first.
  useEffect(() => {
    markStartupStage('FirstReactRender');
  }, []);
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
