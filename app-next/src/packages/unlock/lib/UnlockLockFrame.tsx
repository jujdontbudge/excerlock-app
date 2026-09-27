import { ReactNode, useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { SharedValue, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { LockShackle } from '../../ui/LockShackle';
import { UnlockRing } from './UnlockRing';
import { tokens as t } from '../../ui/tokens';
import { illustrationTokens as art } from '../../ui/illustrationTokens';
import { useUnlockMotion } from './useUnlockMotion';
import { Confetti } from '../../ui/Confetti';
import { scheduleHaptic } from '../../ui/haptics';
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
  const m = useUnlockMotion(),
    { reduced } = m,
    lift = useSharedValue(0),
    scale = useSharedValue(1),
    [burst, setBurst] = useState(false);
  useEffect(() => {
    if (phase !== 'lifted') {
      lift.value = 0;
      return;
    }
    lift.value = m.delay(m.duration.press, m.timing(1, 'emphasized'));
    scale.value = m.sequence(m.timing(m.scale.pressed, 'press'), m.timing(1, 'press'));
    const cancelHaptic = scheduleHaptic('unlock', reduced ? 0 : m.duration.press);
    const confetti = setTimeout(() => {
      if (!reduced && celebrate) setBurst(true);
    }, m.duration.emphasized);
    return () => {
      cancelHaptic();
      clearTimeout(confetti);
    };
  }, [phase, reduced, celebrate, lift, scale, m]);
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
