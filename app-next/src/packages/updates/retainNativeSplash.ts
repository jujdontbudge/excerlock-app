import * as SplashScreen from 'expo-splash-screen';

export const nativeSplashRetained = SplashScreen.preventAutoHideAsync().then(() => true, () => false);

export function hideRetainedNativeSplash() { SplashScreen.hide(); }
