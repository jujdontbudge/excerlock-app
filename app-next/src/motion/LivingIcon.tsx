import Animated, { LinearTransition } from 'react-native-reanimated';
import { Icon, IconName } from '../icons/Icon';
import { tokens as t } from '../design-system/tokens';
import { illustrationTokens as art } from '../design-system/illustrationTokens';
import { useMotion } from './useMotion';
import { popIn, fadeOut, fadeIn } from './presets';
/** A floating glyph: a pictogram (`hero`, `card`) or, inline, a UI icon size. */
export function LivingIcon({
  name,
  size = 'hero',
  tint,
}: {
  name: IconName;
  size?: keyof typeof art.pictogram | keyof typeof t.icon;
  tint?: string;
}) {
  const m = useMotion();
  const px = size === 'hero' || size === 'card' ? art.pictogram[size] : t.icon[size];
  return (
    <Animated.View
      entering={popIn(m.reduced)}
      exiting={fadeOut}
      layout={LinearTransition.duration(m.reduced ? 0 : m.duration.standard)}
      style={{ alignSelf: 'center' }}>
      <Animated.View
        style={{
          alignSelf: 'center',
          animationName: m.reduced
            ? undefined
            : {
                from: { transform: [{ translateY: 0 }] },
                '50%': { transform: [{ translateY: -m.distance.float }] },
                to: { transform: [{ translateY: 0 }] },
              },
          animationDuration: m.duration.breathe,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        }}>
        <Animated.View key={name} entering={fadeIn} exiting={fadeOut}>
          <Icon name={name} size={px} tint={tint} variant={tint ? 'utility' : 'color'} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
