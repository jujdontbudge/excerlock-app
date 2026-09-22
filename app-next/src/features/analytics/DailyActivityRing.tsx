import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue } from 'react-native-reanimated';
import { Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { useMotion } from '../../motion/useMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 266;
const STROKE = 21;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DailyActivityRing({ value, goal, unit, dayLabel }: {
  value: number;
  goal: number;
  unit: string;
  dayLabel: string;
}) {
  const progress = useSharedValue(0);
  const motion = useMotion();
  const ratio = goal > 0 ? Math.max(0, value / goal) : 0;
  useEffect(() => {
    // A day past its goal fills for longer, up to twice the emphasized duration.
    progress.set(motion.timing(ratio, 'emphasized', { curve: 'enter', stretch: Math.max(1, Math.min(2, ratio)) }));
  }, [motion, progress, ratio]);
  const baseAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - Math.min(1, progress.get())),
  }));
  const overflowAnimatedProps = useAnimatedProps(() => {
    const excess = Math.max(0, progress.get() - 1);
    const lap = excess > 0 && excess % 1 === 0 ? 1 : excess % 1;
    return {
      opacity: excess > 0 ? 1 : 0,
      strokeDashoffset: CIRCUMFERENCE * (1 - lap),
    };
  });
  const overflowEndAnimatedProps = useAnimatedProps(() => {
    const excess = Math.max(0, progress.get() - 1);
    const lap = excess > 0 && excess % 1 === 0 ? 1 : excess % 1;
    const angle = -Math.PI / 2 + Math.PI * 2 * lap;
    return {
      opacity: excess > 0 ? 1 : 0,
      cx: SIZE / 2 + RADIUS * Math.cos(angle),
      cy: SIZE / 2 + RADIUS * Math.sin(angle),
    };
  });
  const overflowShadowAnimatedProps = useAnimatedProps(() => {
    const excess = Math.max(0, progress.get() - 1);
    const lap = excess > 0 && excess % 1 === 0 ? 1 : excess % 1;
    const angle = -Math.PI / 2 + Math.PI * 2 * lap;
    return {
      opacity: excess > 0 ? 1 : 0,
      cx: SIZE / 2 + RADIUS * Math.cos(angle) + Math.sin(angle) * 3,
      cy: SIZE / 2 + RADIUS * Math.sin(angle) - Math.cos(angle) * 3,
    };
  });
  return (
    <View accessible accessibilityLabel={unit === 'steps' ? 'Daily steps ring' : 'Daily gym ring'} style={s.card}>
      <View style={s.ring}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Defs>
            <LinearGradient
              id="ring-gradient"
              gradientUnits="userSpaceOnUse"
              x1={SIZE / 2 - RADIUS}
              y1={SIZE / 2}
              x2={SIZE / 2 + RADIUS}
              y2={SIZE / 2}>
              <Stop offset="0" stopColor={t.chart.ringBase} />
              <Stop offset="0.5" stopColor={t.chart.ringMid} />
              <Stop offset="1" stopColor={t.chart.ringOverflow} />
            </LinearGradient>
          </Defs>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={t.border.divider} strokeWidth={STROKE} />
          <AnimatedCircle
            testID="Daily ring base lap"
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="url(#ring-gradient)"
            strokeWidth={STROKE}
            strokeLinecap={ratio >= 1 ? 'butt' : 'round'}
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={baseAnimatedProps}
            rotation={-90}
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
          {ratio > 1 ? (
            <AnimatedCircle
              testID="Daily ring overflow lap"
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="url(#ring-gradient)"
              strokeWidth={STROKE}
              strokeLinecap="butt"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={overflowAnimatedProps}
              rotation={-90}
              origin={`${SIZE / 2}, ${SIZE / 2}`}
            />
          ) : null}
          {ratio > 1 ? (
            <AnimatedCircle
              r={STROKE / 2}
              fill={t.chart.ringEndpointShadow}
              animatedProps={overflowShadowAnimatedProps}
            />
          ) : null}
          {ratio > 1 ? (
            <AnimatedCircle
              r={STROKE / 2 + 1}
              fill={t.chart.ringEndpoint}
              animatedProps={overflowEndAnimatedProps}
            />
          ) : null}
        </Svg>
        <View style={s.center}>
          <Label variant="label" style={s.dayLabel} numberOfLines={1}>{dayLabel}</Label>
          <Label variant="metric" style={s.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {Math.round(value).toLocaleString('en-US')}
          </Label>
          <Label variant="support" tone="secondary" numberOfLines={1}>
            of {Math.round(goal).toLocaleString('en-US')} {unit}
          </Label>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { alignItems: 'center', paddingVertical: t.space.md },
  ring: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', top: STROKE, right: STROKE, bottom: STROKE, left: STROKE,
    alignItems: 'center', justifyContent: 'center' },
  // Captain exception to the orange-text rule: the day caption stays orange (guardrails/design-system.test.ts).
  dayLabel: { color: t.brand.primary },
  value: { marginTop: t.space.xs, marginBottom: -t.space.md },
});
