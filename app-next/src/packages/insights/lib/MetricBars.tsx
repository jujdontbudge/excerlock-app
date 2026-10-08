import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Label } from '../../ui';
import { tokens as t } from '../../ui/tokens';
import { useMotion } from '../../ui/useMotion';

export type MetricPoint = { label: string; value: number | null; selected?: boolean };
const PLOT = t.chart.barPlot;
const MIN_FILL = t.chart.barMinimum;

export function MetricBars({ title, data, unit }: { title: string; data: MetricPoint[]; unit: string }) {
  const measured = data.flatMap((point) => point.value === null ? [] : [point.value]);
  const max = Math.max(1, ...measured);
  const average = measured.length ? measured.reduce((total, value) => total + value, 0) / measured.length : 0;
  return (
    <View testID="Analytics week chart" accessibilityLabel={`${title} chart, ${unit}`} style={s.card}>
      <View style={{ gap: t.space.sm }}>
        <View style={s.plot}>
          {average > 0 ? (
            <View style={[s.average, { bottom: PLOT * (average / max) }]} />
          ) : null}
          <View style={s.columns}>
            {data.map((point, index) => (
              <View key={`${point.label}-${index}`} style={s.column}>
                <View style={s.track}>
                  {point.value === null ? null : (
                    <SmoothBar value={point.value} max={max} selected={point.selected} delay={index * t.motion.stagger.list} />
                  )}
                </View>
                <BarValue
                  value={point.value}
                  max={max}
                  delay={index * t.motion.stagger.list}
                />
              </View>
            ))}
          </View>
        </View>
        <View style={s.labels}>
          {data.map((point, index) => (
            <View key={`${point.label}-label-${index}`} style={s.labelCell}>
              <Label variant="micro" tone={point.selected ? 'primary' : 'secondary'} style={{ textAlign: 'center' }}>
                {point.label}
              </Label>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function fillRatio(value: number, max: number) {
  return value <= 0 ? 0 : Math.max(MIN_FILL / PLOT, value / max);
}

function SmoothBar({ value, max, selected, delay }: { value: number; max: number; selected?: boolean; delay: number }) {
  const progress = useSharedValue(0);
  const motion = useMotion();
  useEffect(() => {
    const target = fillRatio(value, max) * 100;
    progress.set(motion.delay(delay, motion.timing(target, 'emphasized', { curve: 'enter' })));
  }, [value, max, delay, motion, progress]);
  const style = useAnimatedStyle(() => ({ height: `${progress.get()}%` }));
  return <Animated.View style={[s.bar, { backgroundColor: selected ? t.brand.lockHighlight : t.brand.primary }, style]} />;
}

function BarValue({ value, max, delay }: { value: number | null; max: number; delay: number }) {
  const progress = useSharedValue(0);
  const motion = useMotion();
  useEffect(() => {
    const target = value === null ? 0 : fillRatio(value, max) * PLOT;
    progress.set(motion.delay(delay, motion.timing(target, 'emphasized', { curve: 'enter' })));
  }, [value, max, delay, motion, progress]);
  const style = useAnimatedStyle(() => ({ bottom: progress.get() + t.space.xs }));
  return (
    <Animated.View pointerEvents="none" style={[s.valueSlot, style]}>
      {value === null ? null : (
        <Label variant="micro" style={s.value} numberOfLines={1}>
          {Math.round(value).toLocaleString('en-US')}
        </Label>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: t.surface.softChoice, borderRadius: t.radius.card,
    borderWidth: t.stroke.hairline, borderColor: t.surface.transparent, padding: t.space.lg, gap: t.space.sm },
  plot: { height: PLOT + t.chart.barHeadroom, justifyContent: 'flex-end' },
  average: { position: 'absolute', left: 0, right: 0, height: t.stroke.hairline,
    borderTopWidth: t.stroke.hairline, borderColor: t.chart.grid, borderStyle: 'dashed' },
  columns: { height: PLOT, flexDirection: 'row' },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  track: { height: '100%', width: t.chart.barWidth, justifyContent: 'flex-end', borderRadius: t.radius.pill,
    backgroundColor: t.surface.selected, overflow: 'hidden' },
  bar: { width: '100%', borderRadius: t.radius.pill },
  valueSlot: { position: 'absolute', left: -t.space.sm, right: -t.space.sm, alignItems: 'center' },
  value: { color: t.text.primary, textAlign: 'center' },
  labels: { flexDirection: 'row' },
  labelCell: { flex: 1 },
});
