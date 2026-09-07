import { useId } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { welcomeTokens as w } from '../../../design-system/welcomeTokens';
import { welcomeCopy as c } from '../../../content/welcome';
import { useMotion } from '../../../motion/useMotion';
import { Reveal } from '../../../motion/Reveal';
import { activityPaths } from './activityPaths';
export function ActivityTile({ index }: { index: number }) {
  const p = w.control,
    tile = p.tiles[index],
    icon = activityPaths[tile.icon],
    m = useMotion(),
    id = useId().replace(/:/g, '');
  return (
    <View style={{ position: 'absolute', left: tile.x, top: tile.y }}>
      <Reveal index={index + 1}>
        <Animated.View
          style={{
            width: p.tileSize,
            height: p.tileSize,
            borderRadius: p.radius,
            boxShadow: p.shadow,
            transform: [{ rotate: tile.tilt }],
            animationName: m.reduced
              ? undefined
              : {
                  from: { transform: [{ rotate: tile.tilt }, { translateY: 0 }] },
                  '50%': { transform: [{ rotate: tile.tilt }, { translateY: -m.distance.float }] },
                  to: { transform: [{ rotate: tile.tilt }, { translateY: 0 }] },
                },
            animationDuration: m.duration.breathe + index * m.stagger.hero,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-in-out',
          }}>
          <LinearGradient
            colors={tile.peach ? [p.peach, p.peachEnd] : [w.brands.white, w.brands.white]}
            style={{ flex: 1, borderRadius: p.radius, justifyContent: 'center', alignItems: 'center' }}>
            <Svg
              width={p.iconSize}
              height={p.iconSize}
              viewBox={icon.viewBox}
              accessible
              accessibilityRole="image"
              accessibilityLabel={c.activities[index]}>
              <Defs>
                <SvgGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0" stopColor={p.orange} />
                  <Stop offset="1" stopColor={p.deep} />
                </SvgGradient>
              </Defs>
              <Path d={icon.path} fill={`url(#${id})`} />
            </Svg>
          </LinearGradient>
        </Animated.View>
      </Reveal>
    </View>
  );
}
