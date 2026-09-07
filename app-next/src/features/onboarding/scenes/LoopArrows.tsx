import Svg, { G, Path } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { tokens as t } from '../../../design-system/tokens';
import { useMotion } from '../../../motion/useMotion';
/** Short circular connectors leave room for freestanding labels, without masking cards. */
export function LoopArrows({ expanded }: { expanded: boolean }) {
  const m = useMotion();
  return (
    <>
      {[4, 6].map((count) => (
        <Animated.View
          key={count}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: (expanded ? 6 : 4) === count ? 1 : 0,
            transitionProperty: 'opacity',
            transitionDuration: m.reduced ? 0 : m.duration.reveal,
          }}>
          <Svg width="100%" height="100%" viewBox="0 0 360 500" accessible={false}>
            {Array.from({ length: count }, (_, index) => {
              const start =
                  count === 6 && index === 2
                    ? 65
                    : count === 6 && index === 3
                      ? 100
                      : -90 + ((index + 0.36) * 360) / count,
                end =
                  count === 6 && index === 2
                    ? 80
                    : count === 6 && index === 3
                      ? 115
                      : -90 + ((index + 0.68) * 360) / count;
              const rx = count === 4 ? 139 : 146;
              const ry = count === 4 ? 185 : 198;
              const point = (a: number) => [
                180 + rx * Math.cos((a * Math.PI) / 180),
                250 + ry * Math.sin((a * Math.PI) / 180),
              ];
              const [x, y] = point(start),
                [ex, ey] = point(end);
              return (
                <G key={index}>
                  <Path
                    d={`M${x} ${y} A${rx} ${ry} 0 0 1 ${ex} ${ey}`}
                    fill="none"
                    stroke={t.brand.primary}
                    strokeWidth={t.stroke.chart}
                    strokeLinecap="round"
                  />
                  <G transform={`translate(${ex} ${ey}) rotate(${end + 90})`}>
                    <Path d="M3 0 L-8 -5 L-8 5 Z" fill={t.brand.primary} />
                  </G>
                </G>
              );
            })}
          </Svg>
        </Animated.View>
      ))}
    </>
  );
}
