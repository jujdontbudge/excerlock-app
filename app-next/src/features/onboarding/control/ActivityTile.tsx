import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, IconName } from '../../../icons/Icon';
import Animated from 'react-native-reanimated';
import { welcomeTokens as w } from '../../../design-system/welcomeTokens';
import { welcomeCopy as c } from '../../../content/welcome';
import { useMotion } from '../../../motion/useMotion';
import { Reveal } from '../../../motion/Reveal';
const activityNames: Record<string, IconName> = {
  'person-walking': 'walking',
  dumbbell: 'gym',
};
export function ActivityTile({ index }: { index: number }) {
  const p = w.control,
    tile = p.tiles[index],
    m = useMotion();
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
            <Icon name={activityNames[tile.icon]} size={p.iconSize} tint={p.orange} label={c.activities[index]} />
          </LinearGradient>
        </Animated.View>
      </Reveal>
    </View>
  );
}
