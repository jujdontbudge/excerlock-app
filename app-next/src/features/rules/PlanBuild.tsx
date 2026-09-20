import { useEffect, useRef, useState } from 'react';
import { TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, Easing, interpolateColor, SharedValue, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { SelectionCheck } from '../../design-system/SelectionCheck';
import { tokens as t } from '../../design-system/tokens';
import { Icon } from '../../icons/Icon';
import { activities } from '../../content/activities';
import { ruleName } from '../../domain/ruleName';
import { scheduleLabel } from '../../domain/scheduleLabel';
import { Rule } from '../../domain/types';
import { useMotion } from '../../motion/useMotion';
import { PLAN_MOTION, PLAN_RING, taskMotion, smooth } from './planMotion';
const Arc = Animated.createAnimatedComponent(Circle);
const Counter = Animated.createAnimatedComponent(TextInput);
const RADIUS = PLAN_RING.radius;
const LENGTH = 2 * Math.PI * RADIUS;

function Task({ title, index, elapsed, checked, working, reduced, rowHeight }: {
  title: string; index: number; elapsed: SharedValue<number>; checked: boolean; working: boolean; reduced: boolean; rowHeight: number;
}) {
  const style = useAnimatedStyle(() => {
    const m = taskMotion(index, elapsed.get());
    // The closing pill never resolves: it fades with the rest of the screen at 100%.
    const exit = working ? 0 : m.exit;
    const fill = working ? 0 : Math.max(0, Math.min(1, (elapsed.get() - Math.max(index * 1000, 150)) / 140));
    return {
      backgroundColor: interpolateColor(fill, [0, 1], [t.surface.card, t.brand.primary]),
      borderColor: interpolateColor(fill, [0, 1], [t.border.outline, t.brand.primary]),
      opacity: reduced ? 1 : (1 - exit) * Math.max(0, Math.min(1, 3 - m.slot)) * (1 - Math.min(2, m.slot) * 0.24),
      transform: reduced ? [] : [{ translateY: m.slot * (rowHeight + 12) }],
    };
  });
  const titleStyle = useAnimatedStyle(() => ({
    // Keep readable dark text until the fill has become dark enough for white.
    color: !working && elapsed.get() >= Math.max(index * 1000, 150) + 105 ? t.text.onAccent : t.text.primary,
  }));
  return <Animated.View accessible accessibilityRole="checkbox" accessibilityLabel={title} accessibilityState={{ checked }}
    style={[{ position: 'absolute', left: 0, right: 0, top: reduced ? index * (rowHeight + 12) : 0, height: rowHeight, borderWidth: t.stroke.hairline,
      borderRadius: t.radius.card, paddingHorizontal: t.space.lg, flexDirection: 'row', alignItems: 'center', gap: t.space.md }, style]}>
    <Animated.Text allowFontScaling maxFontSizeMultiplier={t.a11y.textScale}
      style={[t.type.label, { flex: 1 }, titleStyle]}>{title}</Animated.Text>
    {checked ? <SelectionCheck /> : <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="clock" size={24} tint={t.text.secondary} />
    </View>}
  </Animated.View>;
}

/** Assembles the already-selected rule facts; the percentage is a presentation sequence. */
export function PlanBuild({ rule, onComplete }: { rule: Rule; onComplete: () => void }) {
  const m = useMotion();
  const { height, fontScale } = useWindowDimensions();
  const [completed, setCompleted] = useState(0);
  const callback = useRef(onComplete);
  const elapsed = useSharedValue(0);
  const rowHeight = Math.max(64, 48 * Math.min(fontScale, t.a11y.textScale));
  const tasks = [activities.find((a) => a.id === rule.activity)!.title, ruleName(rule), scheduleLabel(rule.schedule),
    'Personalizing your routine', 'Preparing your weekly goals', 'Putting your plan together'];
  useEffect(() => { callback.current = onComplete; }, [onComplete]);
  useEffect(() => {
    // Continue through the post-100% hold and fade; stopping at `ready` leaves the loading UI stranded onscreen.
    elapsed.set(withTiming(PLAN_MOTION.buildDone, { duration: m.reduced ? m.duration.fast : PLAN_MOTION.buildDone, easing: Easing.linear }));
    return () => cancelAnimation(elapsed);
  }, [elapsed, m.duration.fast, m.reduced]);
  useEffect(() => {
    const timers = m.reduced ? [
      setTimeout(() => setCompleted(5), m.duration.fast),
      setTimeout(() => callback.current(), m.duration.slow),
    ] : [
      ...[0, 1, 2, 3, 4].map((n) => setTimeout(() => setCompleted(n + 1), Math.max(n * 1000, 150))),
      setTimeout(() => callback.current(), PLAN_MOTION.buildDone),
    ];
    return () => timers.forEach(clearTimeout);
  }, [m.duration.fast, m.duration.slow, m.reduced]);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: LENGTH * (1 - Math.min(1, elapsed.get() / PLAN_MOTION.count)) }));
  const counter = useAnimatedProps(() => {
    const pct = Math.min(100, Math.round(elapsed.get() / PLAN_MOTION.count * 100));
    return { text: pct >= 100 ? '100' : `${pct}%`, defaultValue: '0%' };
  });
  // At 100% the screen holds one beat, then everything fades out together before the celebration.
  const content = useAnimatedStyle(() => ({
    opacity: m.reduced ? 1 : 1 - smooth((elapsed.get() - (PLAN_MOTION.count + PLAN_MOTION.hold)) / PLAN_MOTION.fadeout),
  }));
  const ring = PLAN_RING.size, middle = ring / 2;
  return <Animated.View style={[{ flex: 1, paddingTop: height * PLAN_RING.topFraction, alignItems: 'center', gap: 32 }, content]}>
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Preparing your plan"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(completed, 5) / 5 * 100) }}
      style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={ring} height={ring} style={{ position: 'absolute' }}>
        <Circle cx={middle} cy={middle} r={RADIUS} stroke={t.border.divider} strokeWidth={PLAN_RING.stroke} fill="none" />
        <Arc cx={middle} cy={middle} r={RADIUS} stroke={t.brand.primary} strokeWidth={PLAN_RING.stroke} fill="none"
          strokeLinecap="round" strokeDasharray={`${LENGTH} ${LENGTH}`} rotation={-90} origin={`${middle},${middle}`} animatedProps={arc} />
      </Svg>
      <Counter editable={false} accessible={false} pointerEvents="none" defaultValue="0%" animatedProps={counter}
        style={[t.type.metric, { color: t.brand.primary, padding: 0, textAlign: 'center', width: 180, fontVariant: ['tabular-nums'] }]} />
    </View>
    <View style={{ width: '100%', height: m.reduced ? (rowHeight + 12) * tasks.length : (rowHeight + 12) * 3 }}>
      {tasks.map((title, index) => <Task key={title} title={title} index={index} elapsed={elapsed}
        checked={index < 5 && completed > index} working={index === 5} reduced={m.reduced} rowHeight={rowHeight} />)}
    </View>
  </Animated.View>;
}
