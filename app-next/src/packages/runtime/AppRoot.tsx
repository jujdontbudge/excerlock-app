import { useEffect } from 'react';
import { RootNavigator } from '../launch/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppRuntimeProvider } from './lib/AppRuntimeProvider';
import { NoticeHost } from '../ui/Notice';
import { markStartupStage } from '../../../modules/excerlock-startup';
import { useFonts } from 'expo-font';
import { View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { useFirstOpenUpdate, useOtaCover } from '../updates/updates';
import { SplashCover } from '../updates/SplashCover';
import * as SplashScreen from 'expo-splash-screen';
import {
  Baloo2_400Regular,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
void SplashScreen.preventAutoHideAsync().catch(() => undefined);
const exposeSplashCover = () => requestAnimationFrame(() => requestAnimationFrame(() => SplashScreen.hide()));
export function AppRoot() {
  const launchSettled = useFirstOpenUpdate();
  const covered = useOtaCover();
  const [fontsLoaded] = useFonts({
    Baloo2_400Regular,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
  });
  useEffect(() => {
    markStartupStage('FirstReactRender');
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppRuntimeProvider>
          <StatusBar style="dark" />
          {fontsLoaded && launchSettled ? <RootNavigator /> : null}
        </AppRuntimeProvider>
        <NoticeHost />
      </SafeAreaProvider>
        {covered || !fontsLoaded ? <FullWindowOverlay><SplashCover onReady={exposeSplashCover} /></FullWindowOverlay> : null}
      </View>
    </GestureHandlerRootView>
  );
}
