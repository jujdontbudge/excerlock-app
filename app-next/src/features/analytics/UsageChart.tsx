import { useEffect } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withDelay, withTiming } from 'react-native-reanimated';
import { Label } from '../../design-system';
import { formatNumber } from '../../content/locale';
import { tokens as t } from '../../design-system/tokens';
import { useMotion } from '../../motion/useMotion';
import { analyticsCopy as c } from '../../content/analytics';
const Bar = Animated.createAnimatedComponent(Rect);
function Column({ value, max, index, color }: { value: number | null; max: number; index: number; color: string }) {
  const p = useSharedValue(0),
    m = useMotion();
  useEffect(() => {
    p.set(m.reduced ? 1 : withDelay(index * m.stagger.list, withTiming(1, { duration: m.duration.reveal })));
  }, [p, m.reduced, m.stagger.list, m.duration.reveal, index]);
  const props = useAnimatedProps(() => ({
    height: ((value ?? 0) / max) * 100 * p.get(),
    y: 100 - ((value ?? 0) / max) * 100 * p.get(),
  }));
  return <Bar x={index * 48 + 12} width={24} rx={t.space.xs} fill={color} animatedProps={props} />;
}
export function UsageChart({
  data,
  label,
  estimate,
  color = t.chart.comparison,
}: {
  data: { label: string; value: number | null }[];
  label: string;
  estimate?: number;
  color?: string;
}) {
  const { fontScale } = useWindowDimensions(),
    max = Math.max(1, estimate ?? 0, ...data.map((d) => d.value ?? 0)),
    width = data.length * 48;
  return (
    <View style={{ gap: t.space.md }}>
      <Label variant="section" accessibilityRole="header">
        {label}
      </Label>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: '100%' }}>
        <View style={{ width: Math.max(width, width * Math.min(fontScale, t.a11y.textScale)) }}>
          <Svg
            width="100%"
            height={t.layout.chartHeight}
            viewBox={`0 0 ${width} 108`}
            preserveAspectRatio="none"
            accessible={false}>
            {[0, 50, 100].map((y) => (
              <Line key={y} x1={0} x2={width} y1={y} y2={y} stroke={t.chart.grid} strokeWidth={t.stroke.hairline} />
            ))}
            {data.map((d, index) => (
              <Column key={index} value={d.value} max={max} index={index} color={color} />
            ))}
            {estimate !== undefined ? (
              <Line
                x1={0}
                x2={width}
                y1={100 - (estimate / max) * 100}
                y2={100 - (estimate / max) * 100}
                stroke={t.text.secondary}
                strokeDasharray="4 4"
                strokeWidth={t.stroke.hairline}
              />
            ) : null}
          </Svg>
          <View style={{ flexDirection: 'row' }}>
            {data.map((d, i) => (
              <View
                key={i}
                accessible
                accessibilityLabel={`${d.label}: ${d.value === null ? c.noMeasurement : Math.round(d.value)}`}
                style={{ flex: 1, gap: t.space.xs, alignItems: 'center' }}>
                <Label variant="badge">{d.label}</Label>
                <Label variant="badge" tone="secondary">
                  {d.value === null ? '—' : formatNumber(Math.round(d.value))}
                </Label>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      {estimate !== undefined ? (
        <Label variant="support" tone="secondary">
          {c.estimate(estimate)}
        </Label>
      ) : null}
    </View>
  );
}
