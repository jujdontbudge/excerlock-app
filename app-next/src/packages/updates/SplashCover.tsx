import { Image, StyleSheet, View } from 'react-native';
import { tokens } from '../ui/tokens';

const splash = require('../../../assets/running-lock.png');

export function SplashCover({ onReady }: { onReady?: () => void }) {
  return (
    <View accessibilityLabel="ExcerLock" style={styles.cover}>
      <Image source={splash} style={styles.image} resizeMode="contain" onLoadEnd={onReady} />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, backgroundColor: tokens.surface.card, alignItems: 'center', justifyContent: 'center' },
  image: { width: tokens.splash.imageSize, height: tokens.splash.imageSize },
});
