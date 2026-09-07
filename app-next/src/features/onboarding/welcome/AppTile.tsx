import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { welcomeTokens as w } from '../../../design-system/welcomeTokens';
import { tokens as t } from '../../../design-system/tokens';
import { useMotion } from '../../../motion/useMotion';
import { Reveal } from '../../../motion/Reveal';
import { BrandMark } from './BrandMark';
import { BlockedBadge } from './BlockedBadge';
export function AppTile({ index }: { index: number }) {
  const tile = w.tiles[index],
    m = useMotion();
  const backgroundColor =
    tile.name === 'whatsapp' ? w.brands.whatsapp : tile.name === 'tiktok' ? w.brands.tiktok : t.surface.subtle;
  return (
    <View style={{ position: 'absolute', left: tile.x, top: tile.y, width: w.tile.size, height: w.tile.size }}>
      <Reveal index={index}>
        <Animated.View
          style={{
            transform: [{ rotate: tile.tilt }],
            animationName: m.reduced
              ? undefined
              : {
                  from: { transform: [{ translateY: 0 }, { rotate: tile.tilt }] },
                  '50%': { transform: [{ translateY: -m.distance.float }, { rotate: tile.tilt }] },
                  to: { transform: [{ translateY: 0 }, { rotate: tile.tilt }] },
                },
            animationDuration: m.duration.breathe + index * m.stagger.hero,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-in-out',
            width: w.tile.size,
            height: w.tile.size,
            borderRadius: w.tile.radius,
            backgroundColor,
            boxShadow: w.tile.shadow,
          }}>
          {tile.name === 'instagram' ? (
            <LinearGradient
              colors={w.brands.instagram}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', inset: 0, borderRadius: w.tile.radius }}
            />
          ) : null}
          <BrandMark brand={tile.name} />
          <View
            pointerEvents="none"
            style={{ position: 'absolute', inset: 0, borderRadius: w.tile.radius, backgroundColor: w.tile.blockedVeil }}
          />
          <BlockedBadge />
        </Animated.View>
      </Reveal>
    </View>
  );
}
