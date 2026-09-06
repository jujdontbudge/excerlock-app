import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';

import { colors, gradients, radius } from '@/design-system';
import { useDemo } from '@/presentation';

export default function SplashScreen() {
  const router = useRouter();
  const { state } = useDemo();

  useEffect(() => {
    const destination = state.stage === 'home'
      ? '/(tabs)/home'
      : state.stage === 'paywall'
        ? '/paywall'
        : state.stage === 'signup'
          ? '/signup'
          : state.stage === 'builder'
            ? '/condition-builder'
            : `/onboarding/${state.onboarding.step}`;
    const timer = setTimeout(() => router.replace(destination as Href), 650);
    return () => clearTimeout(timer);
  }, [router, state.onboarding.step, state.stage]);

  return (
    <LinearGradient
      accessibilityLabel="ExcerLock launch screen"
      colors={gradients.homeHeat.colors}
      style={styles.screen}
    >
      <View style={styles.glow} />
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={require('../../assets/splash-logo.png')}
        style={styles.logo}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  glow: {
    backgroundColor: colors.surface.cardStrong,
    borderRadius: radius.pill,
    height: 360,
    position: 'absolute',
    width: 360,
  },
  logo: {
    height: 172,
    width: 220,
  },
  screen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
