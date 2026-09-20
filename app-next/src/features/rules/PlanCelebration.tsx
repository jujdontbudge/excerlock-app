import { useEffect, useRef } from 'react';
import { Modal, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon } from '../../icons/Icon';
import { tokens as t } from '../../design-system/tokens';
import { useMotion } from '../../motion/useMotion';
import { PLAN_MOTION as p, PLAN_BADGE as b } from './planMotion';

/**
 * Mirrors the reference replay: the loading screen has already faded to empty, then the
 * check badge and caption fade in at the centre, ripple while they hold, and finally the
 * orange disc blooms out of the badge to cover the screen before the ready screen shows.
 */
export function PlanCelebration({ onCovered, onDone }: { onCovered: () => void; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const m = useMotion();
  const elapsed = useSharedValue(0);
  const callbacks = useRef({ onCovered, onDone });
  const centerX = width / 2;
  const centerY = height / 2;
  const coverScale = Math.hypot(centerX, Math.max(centerY, height - centerY)) / (b.size / 2) + 1;
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
  // The covered hold keeps the orange screen up for a beat before it fades onto the ready screen.
  const layer = useAnimatedStyle(() => ({
    opacity: m.reduced ? 1 : interpolate(elapsed.get(), [0, p.reveal, p.done], [1, 1, 0], 'clamp'),
  }));
  const appear = useAnimatedStyle(() => ({ opacity: m.reduced ? 1 : interpolate(elapsed.get(), [p.gap, p.gap + p.badgeIn], [0, 1], 'clamp') }));
  const disc = useAnimatedStyle(() => {
    const v = Math.max(0, Math.min(1, (elapsed.get() - p.burst) / (p.covered - p.burst)));
    return { transform: [{ scale: m.reduced ? 1 : 1 + v * v * (coverScale - 1) }] };
  });
  // Keep this arithmetic inside each worklet; calling an ordinary JS helper from the UI thread crashes Hermes.
  const ripple1 = useAnimatedStyle(() => {
    const now = elapsed.get();
    const sinceStart = now - (p.gap + p.badgeIn);
    if (m.reduced || sinceStart < 0 || now >= p.burst) return { opacity: 0, transform: [{ scale: 1 }] };
    const v = (sinceStart % b.ripple) / b.ripple;
    return { opacity: 0.4 * (1 - v), transform: [{ scale: 1 + v * 0.55 }] };
  });
  const ripple2 = useAnimatedStyle(() => {
    const now = elapsed.get();
    const sinceStart = now - (p.gap + p.badgeIn) - b.ripple / 2;
    if (m.reduced || sinceStart < 0 || now >= p.burst) return { opacity: 0, transform: [{ scale: 1 }] };
    const v = (sinceStart % b.ripple) / b.ripple;
    return { opacity: 0.4 * (1 - v), transform: [{ scale: 1 + v * 0.55 }] };
  });
  const coin = useAnimatedStyle(() => ({
    opacity: m.reduced ? 1 : interpolate(elapsed.get(), [p.burst - 150, p.burst], [0, 1], 'clamp'),
  }));
  const glyph = useAnimatedStyle(() => ({
    opacity: m.reduced ? 0 : interpolate(elapsed.get(), [p.burst - 150, p.burst], [1, 0], 'clamp'),
  }));
  const at = (left: number, top: number, size: number) =>
    ({ position: 'absolute' as const, left, top, width: size, height: size, borderRadius: size / 2 });
  const badgeTop = centerY - b.size / 2, badgeLeft = centerX - b.size / 2;
  const ring = (extra: object) => [at(badgeLeft - 2, badgeTop - 2, b.size + 4), { borderWidth: 2.5, borderColor: t.brand.primary }, extra];
  return <Modal transparent animationType="none" statusBarTranslucent accessibilityViewIsModal>
    <Animated.View style={[{ flex: 1 }, layer]} testID="plan-celebration">
      {m.reduced ? <LinearGradient colors={[...t.surface.orangeGradient]} style={StyleSheet.absoluteFill} /> : null}
      <Animated.View style={ring(ripple1)} />
      <Animated.View style={ring(ripple2)} />
      <Animated.Text allowFontScaling maxFontSizeMultiplier={t.a11y.textScale}
        style={[t.type.question, { position: 'absolute', top: badgeTop + b.size + 28, left: 24, right: 24, textAlign: 'center', color: t.text.primary }, appear]}>
        Plan created
      </Animated.Text>
      <Animated.View style={[at(badgeLeft, badgeTop, b.size), { overflow: 'hidden' }, appear, disc]}>
        <LinearGradient colors={[t.brand.lockHighlight, t.brand.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[at(badgeLeft, badgeTop, b.size), { alignItems: 'center', justifyContent: 'center' }, appear]}>
        <Animated.View style={glyph}>
          <Icon name="check" size={b.glyph} tint={t.surface.solid} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={[at(centerX - b.coin / 2, badgeTop + (b.size - b.coin) / 2, b.coin), { backgroundColor: t.text.onAccent, alignItems: 'center', justifyContent: 'center' }, coin]}>
        <Icon name="check" size={b.glyph * 0.7} tint={t.brand.primary} />
      </Animated.View>
    </Animated.View>
  </Modal>;
}
