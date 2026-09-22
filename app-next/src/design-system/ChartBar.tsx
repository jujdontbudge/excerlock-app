import { useEffect } from 'react';
import Svg, { Rect } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue } from 'react-native-reanimated';
import { tokens as t } from './tokens';
import { useMotion } from '../motion/useMotion';
const Bar = Animated.createAnimatedComponent(Rect);
export function ChartBar({
  value,
  comparison,
  max,
  index,
}: {
  value: number;
  comparison?: number;
  max: number;
  index: number;
}) {
  const p = useSharedValue(0),
    m = useMotion();
  useEffect(() => {
    p.set(m.delay(index * m.stagger.list, m.timing(1, 'emphasized')));
  }, [p, m, index, value]);
  const active = useAnimatedProps(() => ({
    height: (value / max) * 100 * p.get(),
    y: 100 - (value / max) * 100 * p.get(),
  }));
  const baseline = useAnimatedProps(() => ({
    height: ((comparison ?? 0) / max) * 100 * p.get(),
    y: 100 - ((comparison ?? 0) / max) * 100 * p.get(),
  }));
  return (
    <Svg width="100%" height="100%" viewBox="0 0 28 104" preserveAspectRatio="none">
      {comparison !== undefined ? (
        <Bar x={15} width={10} rx={3} fill={t.chart.comparison} animatedProps={baseline} />
      ) : null}
      <Bar
        x={comparison === undefined ? 5 : 2}
        width={comparison === undefined ? 18 : 10}
        rx={3}
        fill={t.chart.exercise}
        animatedProps={active}
      />
    </Svg>
  );
}
