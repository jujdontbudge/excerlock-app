import { useEffect, useRef } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon } from '../../icons/Icon';
import { Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { useMotion } from '../../motion/useMotion';
import { PLAN_MOTION as p, PLAN_RING, planRingCenterY } from './planMotion';

/**
 * Lives above the route: the check lands on the loading ring the reader is already
 * looking at, then orange blooms out of that spot to cover the screen before the
 * ready screen is revealed underneath.
 */
export function PlanCelebration({ onCovered, onDone }: { onCovered: () => void; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const m = useMotion();
  const elapsed = useSharedValue(0);
  const callbacks = useRef({ onCovered, onDone });
  const centerY = planRingCenterY(height, insets.top);
  const centerX = width / 2;
  const badge = PLAN_RING.checkSize;
  const coverScale = Math.hypot(centerX, Math.max(centerY, height - centerY)) / (badge / 2) + 1;
  useEffect(() => { callbacks.current = { onCovered, onDone }; }, [onCovered, onDone]);
  useEffect(() => {
    elapsed.set(withTiming(p.done, { duration: m.reduced ? m.duration.slow : p.done, easing: Easing.linear }));
    return () => cancelAnimation(elapsed);
  }, [elapsed, m.duration.slow, m.reduced]);
  useEffect(() => {
    const covered = setTimeout(() => callbacks.current.onCovered(), m.reduced ? m.duration.fast : p.covered);
    const done = setTimeout(() => callbacks.current.onDone(), m.reduced ? m.duration.slow : p.done);
    return () => { clearTimeout(covered); clearTimeout(done); };
  }, [m.duration.fast, m.duration.slow, m.reduced]);
  const layer = useAnimatedStyle(() => ({
    opacity: m.reduced ? 1 : interpolate(elapsed.get(), [0, p.fade, p.done], [1, 1, 0], 'clamp'),
  }));
  const circle = useAnimatedStyle(() => {
    const v = Math.max(0, Math.min(1, (elapsed.get() - p.burst) / (p.covered - p.burst)));
    return { transform: [{ scale: m.reduced ? 1 : 1 + v * v * (coverScale - 1) }] };
  });
  const halo = useAnimatedStyle(() => ({
    opacity: m.reduced ? 0 : interpolate(elapsed.get(), [0, p.covered], [0.24, 0], 'clamp'),
    transform: [{ scale: m.reduced ? 1 : interpolate(elapsed.get(), [0, p.covered], [1, 2.2], 'clamp') }],
  }));
  const at = (left: number, top: number, size: number) =>
    ({ position: 'absolute' as const, left, top, width: size, height: size, borderRadius: size / 2 });
  return <Modal transparent animationType="none" statusBarTranslucent accessibilityViewIsModal>
    <Animated.View style={[{ flex: 1 }, layer]} testID="plan-celebration">
      {m.reduced ? <LinearGradient colors={[...t.surface.orangeGradient]} style={StyleSheet.absoluteFill} /> : null}
      <Animated.View style={[at(centerX - (badge + 16) / 2, centerY - (badge + 16) / 2, badge + 16), { backgroundColor: t.brand.primary }, halo]} />
      <View style={{ position: 'absolute', top: centerY + badge / 2 + 12, left: 24, right: 24 }}>
        <Label variant="section" style={{ textAlign: 'center', color: m.reduced ? t.text.onAccent : t.text.primary }}>Plan created</Label>
      </View>
      <Animated.View style={[at(centerX - badge / 2, centerY - badge / 2, badge), { overflow: 'hidden' }, circle]}>
        <LinearGradient colors={[t.brand.lockHighlight, t.brand.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <View style={[at(centerX - badge / 2, centerY - badge / 2, badge), { backgroundColor: t.text.onAccent, alignItems: 'center', justifyContent: 'center' }]}>
        <Icon name="check" size={badge / 2} tint={t.brand.primary} />
      </View>
    </Animated.View>
  </Modal>;
}
