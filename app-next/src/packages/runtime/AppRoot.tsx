import { useEffect } from 'react';
import { RootNavigator } from '../launch/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppRuntimeProvider } from './lib/AppRuntimeProvider';
import { NoticeHost } from '../ui/Notice';
import { markStartupStage } from '../../../modules/excerlock-startup';
import { useFonts } from 'expo-font';
import {
  Baloo2_400Regular,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
export function AppRoot() {
  const [fontsLoaded] = useFonts({
    Baloo2_400Regular,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
  });
  useEffect(() => {
    markStartupStage('FirstReactRender');
  }, []);
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView>
      <SafeAreaProvider>
        <AppRuntimeProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AppRuntimeProvider>
        <NoticeHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
