import Svg, { Path } from 'react-native-svg';
import Animated, { SharedValue, useAnimatedProps } from 'react-native-reanimated';
import { ringGeometry } from '../features/unlock/geometry';
import { tokens as t } from './tokens';
const AnimatedPath = Animated.createAnimatedComponent(Path);
export function UnlockRing({ width, progress }: { width: number; progress: SharedValue<number> }) {
  const g = ringGeometry(width);
  const props = useAnimatedProps(() => ({ strokeDashoffset: g.length * (1 - progress.value) }));
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
    </Svg>
  );
}
