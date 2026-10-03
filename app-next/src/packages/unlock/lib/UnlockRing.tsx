import Svg, { Path } from 'react-native-svg';
import Animated, { SharedValue, useAnimatedProps } from 'react-native-reanimated';
import { ringGeometry } from './geometry';
import { tokens as t } from '../../ui/tokens';
const AnimatedPath = Animated.createAnimatedComponent(Path);
export function UnlockRing({ width, progress }: { width: number; progress: SharedValue<number> }) {
  const g = ringGeometry(width);
  const props = useAnimatedProps(() => ({ strokeDashoffset: g.length * (1 - progress.value) }));
  const sealed = useAnimatedProps(() => ({ strokeOpacity: progress.value >= 1 ? 1 : 0 }));
  return (
    <Svg pointerEvents="none" width={width} height={width} style={{ position: 'absolute', inset: 0 }}>
      <Path d={g.path} fill="none" stroke={t.brand.lockShade} strokeOpacity={0.35} strokeWidth={g.stroke} />
      <AnimatedPath
        animatedProps={props}
        d={g.path}
        fill="none"
        stroke={t.text.onAccent}
        strokeWidth={g.stroke}
        strokeLinecap="round"
        strokeDasharray={[g.length, g.length]}
      />
      <AnimatedPath animatedProps={sealed} d={g.path} fill="none" stroke={t.text.onAccent} strokeWidth={g.stroke} />
    </Svg>
  );
}
