import Animated from 'react-native-reanimated';
import { Icon, IconName, IconTone } from '../icons/Icon';
import { tokens as t } from '../design-system/tokens';
import { illustrationTokens as art } from '../design-system/illustrationTokens';
import { useMotion } from './useMotion';
import { popIn, fadeOut, fadeIn, layoutTransition } from './presets';
/** A floating glyph: a pictogram (`hero`, `card`) or, inline, a UI icon size. */
export function LivingIcon({
  name,
  size = 'hero',
  tone,
}: {
  name: IconName;
  size?: keyof typeof art.pictogram | keyof typeof t.icon;
  tone?: IconTone;
}) {
  const m = useMotion();
  const px = size === 'hero' || size === 'card' ? art.pictogram[size] : t.icon[size];
  return (
    <Animated.View
      entering={popIn(m.reduced)}
      exiting={fadeOut}
      layout={layoutTransition(m.reduced)}
      style={{ alignSelf: 'center' }}>
      <Animated.View
        style={{
          alignSelf: 'center',
          ...m.keyframes(
            {
              from: { transform: [{ translateY: 0 }] },
              '50%': { transform: [{ translateY: -m.distance.float }] },
              to: { transform: [{ translateY: 0 }] },
            },
            'breathe',
            { loop: true },
          ),
        }}>
        <Animated.View key={name} entering={fadeIn} exiting={fadeOut}>
          <Icon name={name} size={px} tone={tone} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
