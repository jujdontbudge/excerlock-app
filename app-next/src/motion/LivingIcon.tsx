import Animated, { LinearTransition } from 'react-native-reanimated';
import { Icon, IconName } from '../icons/Icon';
import { tokens as t } from '../design-system/tokens';
import { useMotion } from './useMotion';
import { popIn, fadeOut, fadeIn } from './presets';
export function LivingIcon({ name, size = t.layout.heroIcon, tint }: { name: IconName; size?: number; tint?: string }) {
  const m = useMotion();
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
          <Icon name={name} size={size} tint={tint} variant={tint ? 'utility' : 'color'} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
