import { useEffect, useId } from 'react';
import Svg, { Defs, ClipPath, Rect, Path, Line, G } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { tokens as t } from '../../../design-system/tokens';
import { useMotion } from '../../../motion/useMotion';
const Mask = Animated.createAnimatedComponent(Rect);
export function TrendCurves() {
  const progress = useSharedValue(0),
    m = useMotion(),
    id = useId().replace(/:/g, '');
  useEffect(() => {
    progress.set(m.reduced ? 1 : withTiming(1, { duration: m.duration.reveal * 2 }));
  }, [progress, m.reduced, m.duration.reveal]);
  const clip = useAnimatedProps(() => ({ width: progress.get() * 320 }));
  return (
    <Svg width="100%" height="100%" viewBox="0 0 320 240" accessible={false}>
      <Defs>
        <ClipPath id={id}>
          <Mask x={0} y={0} height={240} animatedProps={clip} />
        </ClipPath>
      </Defs>
      {[40, 120, 200, 232].map((y) => (
        <Line key={y} x1={12} x2={308} y1={y} y2={y} stroke={t.chart.grid} strokeWidth={t.stroke.hairline} />
      ))}
      <G clipPath={`url(#${id})`}>
        <Path
          d="M12 28 C130 30 148 204 308 208"
          fill="none"
          stroke={t.chart.comparison}
          strokeWidth={t.stroke.chart}
          strokeDasharray="5 6"
          strokeLinecap="round"
        />
        <Path
          d="M12 202 C128 206 156 53 308 50"
          fill="none"
          stroke={t.brand.primary}
          strokeWidth={t.stroke.chart}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}
