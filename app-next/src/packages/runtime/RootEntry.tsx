import { App } from 'expo-router/build/qualified-entry';
import { View } from 'react-native';
import { useEffect, useState } from 'react';
import { SplashCover } from '../updates/SplashCover';
import { useOtaCover } from '../updates/updates';
import { nativeSplashRetained } from '../updates/retainNativeSplash';

export function RootEntry() {
  const covered = useOtaCover();
  const [retained, setRetained] = useState(false);
  useEffect(() => { void nativeSplashRetained.then(() => setRetained(true)); }, []);
  if (!retained) return null;
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }} accessibilityElementsHidden={covered} importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}>
        <App />
      </View>
      {covered ? <SplashCover /> : null}
    </View>
  );
}
