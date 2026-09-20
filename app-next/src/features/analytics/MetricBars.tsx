import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { useMotion } from '../../motion/useMotion';

export type MetricPoint = { label: string; value: number | null; selected?: boolean };
export function MetricBars({ title, data, unit }: { title: string; data: MetricPoint[]; unit: string }) {
  const measured = data.flatMap((point) => point.value === null ? [] : [point.value]);
  const max = Math.max(1, ...measured);
  const width = Math.max(300, data.length * 46);
  return (
    <View accessible accessibilityLabel={`${title} chart`} style={s.card}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: '100%' }}>
        <View style={{ width, gap: t.space.sm }}>
          <View style={s.plot}>
            <View style={[s.grid, { bottom: '50%' }]} />
            <View style={[s.grid, { bottom: 0 }]} />
            <View style={s.columns}>
              {data.map((point, index) => (
                <View key={`${point.label}-${index}`} style={s.column}>
                  <Label variant="badge" style={s.value} numberOfLines={1}>
                    {point.value === null ? '—' : Math.round(point.value).toLocaleString('en-US')}
                  </Label>
                  <View style={s.track}>
                    {point.value === null ? null : (
                      <SmoothBar value={point.value} max={max} selected={point.selected} delay={index * t.motion.stagger.list} />
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
          <View style={s.labels}>
            {data.map((point, index) => (
              <View key={`${point.label}-label-${index}`} style={s.labelCell}>
                <Label variant="badge" tone={point.selected ? 'primary' : 'secondary'} style={{ textAlign: 'center' }}>
                  {point.label}
                </Label>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <Label variant="support" tone="secondary">{unit}</Label>
    </View>
  );
}
function SmoothBar({ value, max, selected, delay }: { value: number; max: number; selected?: boolean; delay: number }) {
  const progress = useSharedValue(0);
  const motion = useMotion();
  useEffect(() => {
    const target = value <= 0 ? 0 : Math.max(5, value / max * 100);
    progress.set(motion.reduced ? target : withDelay(delay, withTiming(target, {
      duration: t.motion.duration.reveal,
    })));
  }, [value, max, delay, motion.reduced, progress]);
  const style = useAnimatedStyle(() => ({ height: `${progress.get()}%` }));
  return <Animated.View style={[s.bar, { backgroundColor: selected ? t.brand.lockHighlight : t.brand.primary }, style]} />;
}
const s = StyleSheet.create({
  card: { backgroundColor: t.surface.solid, borderRadius: t.radius.card,
    borderWidth: t.stroke.hairline, borderColor: t.border.divider, padding: t.space.lg, gap: t.space.sm },
  plot: { height: 180 },
  grid: { position: 'absolute', left: 0, right: 0, borderTopWidth: t.stroke.hairline, borderColor: t.chart.grid },
  columns: { flex: 1, flexDirection: 'row', gap: t.space.sm },
  column: { width: 38, flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: t.space.xs },
  value: { color: t.text.primary, textAlign: 'center' },
  track: { flex: 1, width: 28, justifyContent: 'flex-end', borderRadius: t.radius.pill,
    backgroundColor: t.surface.well, overflow: 'hidden' },
  bar: { width: '100%', borderRadius: t.radius.pill },
  labels: { flexDirection: 'row', gap: t.space.sm },
  labelCell: { width: 38, flex: 1 },
});
