import { useEffect, useRef, useState } from 'react';
import { TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, Easing, interpolateColor, SharedValue, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { SelectionCheck } from '../../ui/SelectionCheck';
import { tokens as t } from '../../ui/tokens';
import { Icon } from '../../ui/Icon';
import { activities } from '../../ui/activitiesCopy';
import { ruleName } from '../../conditions/ruleName';
import { scheduleLabel } from '../../schedule/scheduleLabel';
import { Rule } from '../../model/types';
import { useMotion } from '../../ui/useMotion';
import { useCapShift, useInputType } from '../../ui/Label';
import { useHapticOnChange } from '../../ui/haptics';
import { PLAN_MOTION, PLAN_RING, planPercentLabel, taskMotion, smooth } from './planMotion';
const Arc = Animated.createAnimatedComponent(Circle);
const Counter = Animated.createAnimatedComponent(TextInput);
const RADIUS = PLAN_RING.radius;
const LENGTH = 2 * Math.PI * RADIUS;

function Task({ title, index, elapsed, checked, reduced, rowHeight }: {
  title: string; index: number; elapsed: SharedValue<number>; checked: boolean; reduced: boolean; rowHeight: number;
}) {
  const style = useAnimatedStyle(() => {
    const m = taskMotion(index, elapsed.get());
    const exit = m.exit;
    const fill = Math.max(0, Math.min(1, (elapsed.get() - Math.max(index * 1000, 150)) / 140));
    return {
      backgroundColor: interpolateColor(fill, [0, 1], [t.surface.softChoice, t.brand.primary]),
      borderColor: interpolateColor(fill, [0, 1], [t.surface.softChoice, t.brand.primary]),
      opacity: reduced ? 1 : (1 - exit) * Math.max(0, Math.min(1, 3 - m.slot)) * (1 - Math.min(2, m.slot) * 0.24),
      transform: reduced ? [] : [{ translateY: m.slot * (rowHeight + 12) }, { translateX: m.swipeX }],
    };
  });
  const shift = useCapShift(t.type.label.fontSize, t.type.label.lineHeight);
  const titleStyle = useAnimatedStyle(() => ({
    color: elapsed.get() >= Math.max(index * 1000, 150) + 105 ? t.text.onAccent : t.text.primary,
  }));
  return <Animated.View accessible accessibilityRole="checkbox" accessibilityLabel={title} accessibilityState={{ checked }}
    style={[{ position: 'absolute', left: 0, right: 0, top: reduced ? index * (rowHeight + 12) : 0, height: rowHeight, borderWidth: t.stroke.hairline,
      borderRadius: t.radius.card, paddingHorizontal: t.space.lg, flexDirection: 'row', alignItems: 'center', gap: t.space.md }, style]}>
    <View testID={`plan-task-clock-${index}`} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="clock" size={t.icon.md} tone={checked ? 'onAccent' : 'muted'} />
    </View>
    <Animated.Text allowFontScaling maxFontSizeMultiplier={t.a11y.textScale}
      style={[t.type.label, { flex: 1, transform: [{ translateY: shift }] }, titleStyle]}>{title}</Animated.Text>
    <View testID={`plan-task-status-${index}`} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
      {checked ? <SelectionCheck /> : <View style={{ width: 24, height: 24, borderRadius: t.radius.pill, borderWidth: t.stroke.hairline, borderColor: t.text.secondary }} />}
    </View>
  </Animated.View>;
}

export function PlanBuild({ rule, onComplete }: { rule: Rule; onComplete: () => void }) {
  const m = useMotion();
  const { height, fontScale } = useWindowDimensions();
  const [completed, setCompleted] = useState(0);
  const callback = useRef(onComplete);
  const elapsed = useSharedValue(0);
  const rowHeight = Math.max(64, 48 * Math.min(fontScale, t.a11y.textScale));
  const tasks = [activities.find((a) => a.id === rule.activity)!.title, ruleName(rule), scheduleLabel(rule.schedule),
    'Personalizing your routine', 'Preparing your goals', 'Putting your plan together'];
  const taskCount = tasks.length;
  useEffect(() => { callback.current = onComplete; }, [onComplete]);
  useHapticOnChange(completed, (next, previous) => (!m.reduced && next === previous + 1 ? 'select' : 'none'));
  useEffect(() => {
    elapsed.set(withTiming(PLAN_MOTION.buildDone, { duration: m.reduced ? m.duration.standard : PLAN_MOTION.buildDone, easing: Easing.linear }));
    return () => cancelAnimation(elapsed);
  }, [elapsed, m.duration.standard, m.reduced]);
  useEffect(() => {
    const timers = m.reduced ? [
      setTimeout(() => setCompleted(taskCount), m.duration.standard),
      setTimeout(() => callback.current(), m.duration.emphasized),
    ] : [
      ...Array.from({ length: taskCount }, (_, n) => setTimeout(() => setCompleted(n + 1), Math.max(n * 1000, 150))),
      setTimeout(() => callback.current(), PLAN_MOTION.buildDone),
    ];
    return () => timers.forEach(clearTimeout);
  }, [taskCount, m.duration.standard, m.duration.emphasized, m.reduced]);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: LENGTH * (1 - Math.min(1, elapsed.get() / PLAN_MOTION.count)) }));
  const counter = useAnimatedProps(() => {
    const pct = Math.min(100, Math.round(elapsed.get() / PLAN_MOTION.count * 100));
    return { text: planPercentLabel(pct), defaultValue: '0%' };
  });
  const content = useAnimatedStyle(() => ({
    opacity: m.reduced ? 1 : 1 - smooth((elapsed.get() - (PLAN_MOTION.count + PLAN_MOTION.hold)) / PLAN_MOTION.fadeout),
  }));
  const ring = PLAN_RING.size, middle = ring / 2;
  const metric = useInputType('metric');
  return <Animated.View style={[{ flex: 1, paddingTop: height * PLAN_RING.topFraction, alignItems: 'center', gap: 32 }, content]}>
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Preparing your plan"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(completed / tasks.length * 100) }}
      style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={ring} height={ring} style={{ position: 'absolute' }}>
        <Circle cx={middle} cy={middle} r={RADIUS} stroke={t.border.divider} strokeWidth={PLAN_RING.stroke} fill="none" />
        <Arc cx={middle} cy={middle} r={RADIUS} stroke={t.brand.primary} strokeWidth={PLAN_RING.stroke} fill="none"
          strokeLinecap="round" strokeDasharray={`${LENGTH} ${LENGTH}`} rotation={-90} origin={`${middle},${middle}`} animatedProps={arc} />
      </Svg>
      <Counter editable={false} accessible={false} pointerEvents="none" defaultValue="0%" animatedProps={counter}
        maxFontSizeMultiplier={t.a11y.textScale}
        style={[metric, { color: t.brand.primary, padding: 0, textAlign: 'center', width: 180, fontVariant: ['tabular-nums'] }]} />
    </View>
    <View style={{ width: '100%', height: m.reduced ? (rowHeight + 12) * tasks.length : (rowHeight + 12) * 3 }}>
      {tasks.map((title, index) => <Task key={title} title={title} index={index} elapsed={elapsed}
        checked={completed > index} reduced={m.reduced} rowHeight={rowHeight} />)}
    </View>
  </Animated.View>;
}
