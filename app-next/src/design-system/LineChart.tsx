import { useEffect, useId } from 'react';
import { View } from 'react-native';
import Svg, { Path, Line, Defs, ClipPath, Rect, G } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { useMotion } from '../motion/useMotion';
import { Reveal } from '../motion/Reveal';
const Mask = Animated.createAnimatedComponent(Rect);
export function LineChart({
  label,
  values,
  comparison,
  startLabel,
  endLabel,
}: {
  label: string;
  values: readonly number[];
  comparison?: readonly number[];
  startLabel: string;
  endLabel: string;
}) {
  const p = useSharedValue(0),
    m = useMotion(),
    id = useId().replace(/:/g, '');
  useEffect(() => {
    p.set(m.reduced ? 1 : withTiming(1, { duration: m.duration.reveal }));
  }, [p, values, m.reduced, m.duration.reveal]);
  const clip = useAnimatedProps(() => ({ width: p.get() * 320 }));
  const max = Math.max(1, ...values, ...(comparison ?? []));
  const path = (series: readonly number[]) =>
    series
      .map((v, i) => {
        const x = 8 + (i / Math.max(1, series.length - 1)) * 304,
          y = 152 - (v / max) * 136;
        if (!i) return `M${x},${y}`;
        const prevX = 8 + ((i - 1) / Math.max(1, series.length - 1)) * 304,
          prevY = 152 - (series[i - 1] / max) * 136;
        return `C${(prevX + x) / 2},${prevY} ${(prevX + x) / 2},${y} ${x},${y}`;
      })
      .join(' ');
  return (
    <Reveal>
      <View accessible accessibilityLabel={label}>
        <Svg width="100%" height={t.layout.chartHeight} viewBox="0 0 320 168">
          <Defs>
            <ClipPath id={id}>
              <Mask x={0} y={0} height={168} animatedProps={clip} />
            </ClipPath>
          </Defs>
          {[16, 84, 152].map((y) => (
            <Line key={y} x1={8} x2={312} y1={y} y2={y} stroke={t.chart.grid} />
          ))}
          <G clipPath={`url(#${id})`}>
            {comparison ? (
              <Path
                d={path(comparison)}
                fill="none"
                stroke={t.chart.comparison}
                strokeWidth={t.stroke.chart}
                strokeDasharray="5 5"
              />
            ) : null}
            <Path
              d={path(values)}
              fill="none"
              stroke={t.brand.primary}
              strokeWidth={t.stroke.chart}
              strokeLinecap="round"
            />
          </G>
        </Svg>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: t.space.md,
        }}>
        <Label variant="support" tone="secondary">
          {startLabel}
        </Label>
        <Label variant="support" style={{ color: t.text.primary }}>
          {endLabel}
        </Label>
      </View>
    </Reveal>
  );
}
