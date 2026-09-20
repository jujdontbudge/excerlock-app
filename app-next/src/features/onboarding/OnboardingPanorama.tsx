import { useEffect } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { tokens as t } from '../../design-system/tokens';
import { useMotion } from '../../motion/useMotion';

/** Live studio controls: crop scale, journey endpoints, wash, and transition speed. */
export const panoramaTuning = {
  scale: 1,
  verticalAnchor: 0.5,
  travelStart: 0,
  travelEnd: 1,
  progressStart: 0.1,
  progressEnd: 0.72,
  overlayOpacity: 0,
  durationMs: 1100,
} as const;

const panorama = require('../../../assets/onboarding/landscape-strip-balanced-v3.png');

/** One unbroken strip, stationary relative to the screen while questions scroll. */
export function OnboardingPanorama({ progress }: { progress: number }) {
  const { width, height } = useWindowDimensions();
  const { reduced } = useMotion();
  const imageHeight = Math.max(height, width / 3) * panoramaTuning.scale;
  const imageWidth = imageHeight * 3;
  const journey = Math.max(0, Math.min(1,
    (progress - panoramaTuning.progressStart) / (panoramaTuning.progressEnd - panoramaTuning.progressStart),
  ));
  const destination = -(imageWidth - width) *
    (panoramaTuning.travelStart + journey * (panoramaTuning.travelEnd - panoramaTuning.travelStart));
  const x = useSharedValue(destination);
  useEffect(() => {
    x.value = reduced ? destination : withTiming(destination, {
      duration: panoramaTuning.durationMs,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [destination, reduced, x]);
  const travel = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.clip}>
      <Animated.View style={[s.strip, {
        width: imageWidth,
        height: imageHeight,
        top: (height - imageHeight) * panoramaTuning.verticalAnchor,
      }, travel]}>
        <Image source={panorama} resizeMode="stretch" style={{ width: '100%', height: '100%' }} />
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, s.wash]} />
    </View>
  );
}

const s = StyleSheet.create({
  clip: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  strip: { position: 'absolute', left: 0 },
  wash: { backgroundColor: t.surface.canvas, opacity: panoramaTuning.overlayOpacity },
});
