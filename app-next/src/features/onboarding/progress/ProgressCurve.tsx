import { useEffect, useId } from 'react';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { welcomeTokens as w } from '../../../design-system/welcomeTokens';
import { useMotion } from '../../../motion/useMotion';
const Stroke = Animated.createAnimatedComponent(Path);
const p = w.progress;
export function ProgressCurve() {
  const m = useMotion(),
    drawn = useSharedValue(0),
    id = useId().replace(/:/g, '');
  useEffect(() => {
    drawn.set(m.reduced ? 1 : withTiming(1, { duration: m.duration.reveal * 2 }));
  }, [drawn, m.reduced, m.duration.reveal]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: p.curveLength * (1 - drawn.get()) }));
  return (
    <Svg accessible={false} width={p.width} height={p.height} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id={id} x1="0%" x2="100%" y1="0%" y2="0%">
          <Stop offset="0" stopColor={p.orange} stopOpacity={0} />
          <Stop offset="0.2" stopColor={p.orange} />
          <Stop offset="0.8" stopColor={p.orange} />
          <Stop offset="1" stopColor={p.orange} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Stroke
        d={p.curve}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={p.stroke}
        strokeLinecap="round"
        strokeDasharray={[p.curveLength, p.curveLength]}
        animatedProps={props}
      />
    </Svg>
  );
}
