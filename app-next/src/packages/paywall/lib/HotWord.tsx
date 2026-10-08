import { useEffect, useState } from 'react';
import { StyleSheet, View, type TextStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat } from 'react-native-reanimated';
import { Label } from '../../ui/Label';
import { useMotion } from '../../ui/useMotion';
import { tokens as t } from '../../ui/tokens';

const hot = t.paywall.hot,
  look = { sweep: 3.4, rest: 2800, band: 0.4, tilt: '18deg', dim: 0.7, haze: 24 } as const;

export function HotWord({
  text,
  variant,
  style,
  glow,
  shineDelay,
}: {
  text: string;
  variant: keyof typeof t.type;
  style?: TextStyle;
  glow: number;
  shineDelay: number;
}) {
  const m = useMotion(),
    [box, setBox] = useState({ width: 0, height: 0 }),
    breath = useSharedValue(1),
    shine = useSharedValue(0);
  useEffect(() => {
    if (m.reduced) return;
    breath.value = withRepeat(m.sequence(m.timing(look.dim, 'breathe', { stretch: 0.5 }), m.timing(1, 'breathe', { stretch: 0.5 })), -1);
    shine.value = m.delay(
      shineDelay,
      withRepeat(m.sequence(m.timing(1, 'emphasized', { stretch: look.sweep }), m.delay(look.rest, m.timing(1, 'press'))), -1),
    );
    return () => [breath, shine].forEach((value) => cancelAnimation(value));
  }, [m, breath, shine, shineDelay]);
  const halo = useAnimatedStyle(() => ({ opacity: breath.value }));
  const band = box.width * look.band;
  const sweep = useAnimatedStyle(() => ({
    transform: [{ translateX: -band * 1.5 + shine.value * (box.width + band * 2) }, { rotate: look.tilt }],
  }));
  const label = (
    <Label variant={variant} accessible={false} style={[{ textAlign: 'center' }, style]}>
      {text}
    </Label>
  );
  return (
    <View onLayout={(e) => setBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', top: -look.haze, bottom: -look.haze, left: -look.haze, right: -look.haze }, halo]}>
        <Label
          variant={variant}
          accessible={false}
          style={[
            { padding: look.haze, textAlign: 'center' },
            style,
            { color: hot.base, textShadowColor: hot.glow, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: glow },
          ]}>
          {text}
        </Label>
      </Animated.View>
      <MaskedView maskElement={label}>
        <View style={{ opacity: 0 }}>{label}</View>
        <LinearGradient pointerEvents="none" colors={hot.fill} style={StyleSheet.absoluteFill} />
        {box.width && !m.reduced ? (
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', top: -box.height / 2, height: box.height * 2, width: band }, sweep]}>
            <LinearGradient colors={hot.shine} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
          </Animated.View>
        ) : null}
      </MaskedView>
    </View>
  );
}
