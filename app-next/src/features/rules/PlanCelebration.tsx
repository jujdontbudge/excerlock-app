import { useEffect, useRef } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon } from '../../icons/Icon';
import { Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { useMotion } from '../../motion/useMotion';
import { PLAN_MOTION as p } from './planMotion';

/** Lives above the route: navigate while opaque, then reveal the ready screen underneath. */
export function PlanCelebration({ onCovered, onDone }: { onCovered: () => void; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const m = useMotion();
  const elapsed = useSharedValue(0);
  const callbacks = useRef({ onCovered, onDone });
  const centerY = height * 0.54;
  const coverScale = Math.hypot(width / 2, Math.max(centerY, height - centerY)) / 32 + 1;
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
    opacity: m.reduced ? 1 : interpolate(elapsed.get(), [0, 180, p.fade, p.done], [0, 1, 1, 0], 'clamp'),
  }));
  const circle = useAnimatedStyle(() => {
    const v = Math.max(0, Math.min(1, (elapsed.get() - p.burst) / (p.covered - p.burst)));
    return { transform: [{ scale: m.reduced ? 1 : 1 + v * v * v * (coverScale - 1) }] };
  });
  const halo = useAnimatedStyle(() => ({
    opacity: m.reduced ? 0 : interpolate(elapsed.get(), [100, 350, p.burst, p.burst + 200], [0, 0.22, 0.14, 0], 'clamp'),
    transform: [{ scale: m.reduced ? 1 : interpolate(elapsed.get(), [0, p.burst], [0.8, 1.7], 'clamp') }],
  }));
  const caption = useAnimatedStyle(() => ({ opacity: interpolate(elapsed.get(), [0, 200, p.burst - 100, p.burst + 180], [0, 1, 1, 0], 'clamp') }));
  return <Modal transparent animationType="none" statusBarTranslucent accessibilityViewIsModal>
    <Animated.View style={[{ flex: 1 }, layer]} testID="plan-celebration">
      <LinearGradient colors={[...t.surface.orangeGradient]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[{ position: 'absolute', left: width / 2 - 48, top: centerY - 48, width: 96, height: 96, borderRadius: 48, backgroundColor: t.brand.primary }, halo]} />
      <Animated.View style={[{ position: 'absolute', left: width / 2 - 32, top: centerY - 32, width: 64, height: 64, borderRadius: 32, overflow: 'hidden' }, circle]}>
        <LinearGradient colors={[t.brand.lockHighlight, t.brand.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <View style={{ position: 'absolute', left: width / 2 - 20, top: centerY - 20, width: 40, height: 40, borderRadius: 20, backgroundColor: t.text.onAccent, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={24} tint={t.brand.primary} />
      </View>
      <Animated.View style={[{ position: 'absolute', top: centerY + 72, left: 24, right: 24 }, caption]}>
        <Label variant="section" style={{ textAlign: 'center' }}>Plan created</Label>
      </Animated.View>
    </Animated.View>
  </Modal>;
}
