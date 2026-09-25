import { useEffect, useId } from 'react';
import Svg, { Defs, ClipPath, Rect, Path, Line, G } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue } from 'react-native-reanimated';
import { tokens as t } from '../../../ui/tokens';
import { useMotion } from '../../../ui/useMotion';
const Mask = Animated.createAnimatedComponent(Rect);
export function TrendCurves() {
  const progress = useSharedValue(0),
    m = useMotion(),
    id = useId().replace(/:/g, '');
  useEffect(() => {
    progress.set(m.timing(1, 'emphasized', { stretch: 2 }));
  }, [progress, m]);
  const clip = useAnimatedProps(() => ({ width: progress.get() * 320 }));
  return (
    <Svg width="100%" height="100%" viewBox="0 0 320 240" accessible={false}>
      <Defs>
        <ClipPath id={id}>
          <Mask x={0} y={0} height={240} animatedProps={clip} />
        </ClipPath>
      </Defs>
      {[40, 120, 200, 232].map((y) => (
        <Line key={y} x1={12} x2={308} y1={y} y2={y} stroke={t.border.divider} strokeWidth={t.stroke.selected} />
      ))}
      <G clipPath={`url(#${id})`}>
        <Path
          d="M12 28 C130 30 148 204 308 208"
          fill="none"
          stroke={t.chart.comparison}
          strokeWidth={t.stroke.chart * 1.5}
          strokeDasharray="7 8"
          strokeLinecap="round"
        />
        <Path
          d="M12 202 C128 206 156 53 308 50"
          fill="none"
          stroke={t.brand.primary}
          strokeWidth={t.stroke.chart * 1.5}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}
