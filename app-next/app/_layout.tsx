import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppRuntimeProvider } from '../src/runtime/AppRuntimeProvider';
export default function RootLayout() {
  return (
    <GestureHandlerRootView>
      <SafeAreaProvider>
        <AppRuntimeProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </AppRuntimeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
