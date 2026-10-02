import { Image, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { tokens } from '../ui/tokens';
import Svg, { Path } from 'react-native-svg';
import { splashMarkPath } from './lib/splashMark';

const splash = require('../../../assets/running-lock.png');

export function SplashCover({ onReady }: { onReady?: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <View accessibilityLabel="ExcerLock" style={styles.cover}>
      <View style={styles.image}>
        <Svg width="100%" height="100%" viewBox="0 0 1254 1254">
          <Path d={splashMarkPath} fill={tokens.splash.ink} fillRule="evenodd" />
        </Svg>
        <Image source={splash} style={[StyleSheet.absoluteFill, { opacity: loaded ? 1 : 0 }]} resizeMode="contain" onLoad={() => setLoaded(true)} onLoadEnd={onReady} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, backgroundColor: tokens.surface.card, alignItems: 'center', justifyContent: 'center' },
  image: { width: tokens.splash.imageSize, height: tokens.splash.imageSize },
});
