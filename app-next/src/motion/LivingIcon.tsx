import Animated from 'react-native-reanimated';
import { Icon, IconName } from '../icons/Icon';
import { tokens as t } from '../design-system/tokens';
import { useMotion } from './useMotion';
import { popIn, fadeOut } from './presets';
export function LivingIcon({ name, size = t.layout.heroIcon }: { name: IconName; size?: number }) {
  const m = useMotion();
  return (
    <Animated.View entering={popIn(m.reduced)} exiting={fadeOut} style={{ alignSelf: 'center' }}>
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
        <Icon name={name} size={size} />
      </Animated.View>
    </Animated.View>
  );
}
