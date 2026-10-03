import { ReactNode, useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { SharedValue, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { LockShackle, shackleShape } from '../../ui/LockShackle';
import { UnlockRing } from './UnlockRing';
import { ringGeometry } from './geometry';
import { tokens as t } from '../../ui/tokens';
import { illustrationTokens as art } from '../../ui/illustrationTokens';
import { useUnlockMotion } from './useUnlockMotion';
import { Confetti } from '../../ui/Confetti';
import { scheduleHaptic } from '../../ui/haptics';
export type UnlockPhase = 'idle' | 'working' | 'lifted';
const open = art.padlock.open,
  wave = art.padlock.wave,
  pinnedLeg = `${((1 - shackleShape.width + shackleShape.thickness) / 2) * 100}%`;
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
    swing = useSharedValue(0),
    pulse = useSharedValue(0),
    scale = useSharedValue(1),
    [burst, setBurst] = useState(false);
  useEffect(() => {
    if (phase !== 'lifted') {
      lift.value = 0;
      swing.value = 0;
      pulse.value = 0;
      return;
    }
    lift.value = m.sequence(m.timing(-open.preload, 'press'), m.spring(1, 'pop'));
    swing.value = m.delay(m.duration.standard, m.spring(1, 'pop'));
    pulse.value = m.delay(m.duration.press, m.timing(1, 'emphasized', { curve: 'enter' }));
    scale.value = m.sequence(m.timing(m.scale.pressed, 'press'), m.timing(1, 'press'));
    const cancelHaptic = scheduleHaptic('unlock', reduced ? 0 : m.duration.press);
    const confetti = setTimeout(() => {
      if (!reduced && celebrate) setBurst(true);
    }, m.duration.standard);
    return () => {
      cancelHaptic();
      clearTimeout(confetti);
    };
  }, [phase, reduced, celebrate, lift, swing, pulse, scale, m]);
  const shackle = useAnimatedStyle(() => ({
    transform: [
      { perspective: width * open.perspective },
      { translateY: -width * open.lift * lift.value },
      { rotateY: `${-open.swing * swing.value}deg` },
    ],
    transformOrigin: [pinnedLeg, '100%', 0],
  }));
  const body = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const shockwave = useAnimatedStyle(() => ({
    opacity: pulse.value > 0 && pulse.value < 1 ? wave.opacity * (1 - pulse.value) : 0,
    transform: [{ scale: 1 + wave.scale * pulse.value }],
  }));
  return (
    <View accessibilityLabel={phase === 'lifted' ? 'Lock open' : 'Lock closed'} style={{ width, alignSelf: 'center' }}>
      <Animated.View style={shackle}>
        <LockShackle bodyWidth={width} sunk={{ pinned: open.pinned, free: open.free }} />
      </Animated.View>
      <Animated.View style={[{ width, height: width, borderRadius: width * art.padlock.bodyRadius, boxShadow: t.shadow.status }, body]}>
        <LinearGradient colors={t.surface.statusGradient} style={{ flex: 1, borderRadius: width * art.padlock.bodyRadius, padding: art.padlock.bodyInset }}>
          <View style={{ flex: 1, overflow: 'hidden', borderRadius: width * art.padlock.bodyRadius - art.padlock.bodyInset }}>
            {surface}
            {overlay}
          </View>
        </LinearGradient>
        <UnlockRing width={width} progress={progress} />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              inset: 0,
              borderRadius: width * art.padlock.bodyRadius,
              borderWidth: ringGeometry(width).stroke,
              borderColor: t.brand.primary,
            },
            shockwave,
          ]}
        />
      </Animated.View>
      {burst && phase === 'lifted' ? <Confetti width={width} /> : null}
    </View>
  );
}
