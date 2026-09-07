import Svg, { G, Path } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { tokens as t } from '../../../design-system/tokens';
import { useMotion } from '../../../motion/useMotion';

/** Two symmetric connector systems; the old one leaves before the new one enters. */
export function LoopArrows({ expanded }: { expanded: boolean }) {
  const m = useMotion();
  return (
    <>
      {[4, 6].map((count) => {
        const appears = (expanded ? 6 : 4) === count;
        return (
          <Animated.View
            key={count}
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              opacity: appears ? 1 : 0,
              transitionProperty: 'opacity',
              transitionDelay: m.reduced || !appears ? 0 : m.duration.planCheck,
              transitionDuration: m.reduced ? 0 : appears ? m.duration.standard : m.duration.fast,
              transitionTimingFunction: 'ease-out',
            }}>
            <Svg width="100%" height="100%" viewBox="0 0 360 500" accessible={false}>
              {Array.from({ length: count }, (_, index) => {
                const step = 360 / count,
                  start = -90 + (index + (count === 4 ? 0.33 : 0.32)) * step,
                  end = -90 + (index + 0.67) * step,
                  rx = count === 4 ? 139 : 146,
                  ry = count === 4 ? 185 : 198,
                  point = (a: number) => [
                    180 + rx * Math.cos((a * Math.PI) / 180),
                    250 + ry * Math.sin((a * Math.PI) / 180),
                  ];
                const [x, y] = point(start),
                  [endX, endY] = point(end),
                  radians = (end * Math.PI) / 180,
                  tangent = (Math.atan2(ry * Math.cos(radians), -rx * Math.sin(radians)) * 180) / Math.PI;
                return (
                  <G key={index}>
                    <Path
                      d={`M${x} ${y} A${rx} ${ry} 0 0 1 ${endX} ${endY}`}
                      fill="none"
                      stroke={t.brand.primary}
                      strokeWidth={t.stroke.chart}
                      strokeLinecap="round"
                    />
                    <G transform={`translate(${endX} ${endY}) rotate(${tangent})`}>
                      <Path d="M4 0 L-7 -5 L-7 5 Z" fill={t.brand.primary} />
                    </G>
                  </G>
                );
              })}
            </Svg>
          </Animated.View>
        );
      })}
    </>
  );
}
