import { ReactNode, useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { LockShackle } from './LockShackle';
import { UnlockRing } from './UnlockRing';
import { tokens as t } from './tokens';
import { illustrationTokens as art } from './illustrationTokens';
import { useUnlockMotion } from '../features/unlock/useUnlockMotion';
import { Confetti } from '../motion/Confetti';
import { feedback } from '../motion/haptics';
export type UnlockPhase = 'idle' | 'working' | 'lifted';
export function UnlockLockFrame({
  surface,
  progress,
  phase,
  overlay,
  celebrate = true,
}: {
  surface: ReactNode;
  progress: SharedValue<number>;
  phase: UnlockPhase;
  overlay?: ReactNode;
  celebrate?: boolean;
}) {
  const { width: screenWidth } = useWindowDimensions(),
    width = Math.min(t.layout.maxWidth - 2 * t.layout.page, screenWidth - 2 * t.layout.page);
  const { reduced } = useUnlockMotion(),
    lift = useSharedValue(0),
    scale = useSharedValue(1),
    [burst, setBurst] = useState(false);
  useEffect(() => {
    if (phase !== 'lifted') {
      lift.value = 0;
      return;
    }
    lift.value = withDelay(180, withTiming(1, { duration: 380 }));
    if (!reduced) scale.value = withSequence(withTiming(0.97, { duration: 90 }), withTiming(1, { duration: 90 }));
    const haptic = setTimeout(() => feedback('success'), 180);
    const confetti = setTimeout(() => {
      if (!reduced && celebrate) setBurst(true);
    }, 420);
    return () => {
      clearTimeout(haptic);
      clearTimeout(confetti);
    };
  }, [phase, reduced, celebrate, lift, scale]);
  const shackle = useAnimatedStyle(() =>
    reduced
      ? { opacity: 1 - lift.value }
      : {
          transform: [{ translateY: -width * 0.14 * lift.value }, { rotateZ: `${-8 * lift.value}deg` }],
          transformOrigin: ['80%', '100%', 0],
        },
  );
  const body = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const open = useAnimatedStyle(() => ({ opacity: lift.value }));
  return (
    <View accessibilityLabel={phase === 'lifted' ? 'Lock open' : 'Lock closed'} style={{ width, alignSelf: 'center' }}>
      <Animated.View style={shackle}>
        <LockShackle bodyWidth={width} />
      </Animated.View>
      {reduced ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: -width * 0.14,
              width,
              transform: [{ rotateZ: '-8deg' }],
              transformOrigin: ['80%', '100%', 0],
            },
            open,
          ]}>
          <LockShackle bodyWidth={width} />
        </Animated.View>
      ) : null}
      <Animated.View style={[{ width, height: width, borderRadius: width * art.padlock.bodyRadius, boxShadow: t.shadow.status }, body]}>
        <LinearGradient colors={t.surface.statusGradient} style={{ flex: 1, borderRadius: width * art.padlock.bodyRadius, padding: art.padlock.bodyInset }}>
          <View style={{ flex: 1, overflow: 'hidden', borderRadius: width * art.padlock.bodyRadius - art.padlock.bodyInset }}>
            {surface}
            {overlay}
          </View>
        </LinearGradient>
        <UnlockRing width={width} progress={progress} />
      </Animated.View>
      {burst && phase === 'lifted' ? <Confetti width={width} /> : null}
    </View>
  );
}
