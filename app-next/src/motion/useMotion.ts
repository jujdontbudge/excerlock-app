import { Easing, useReducedMotion, withTiming } from 'react-native-reanimated';
import { tokens } from '../design-system/tokens';
type Duration = keyof typeof tokens.motion.duration;
type Curve = keyof typeof tokens.motion.easing;
const curves: Record<Curve, ReturnType<typeof Easing.bezier>> = {
  standard: Easing.bezier(...tokens.motion.easing.standard),
  enter: Easing.bezier(...tokens.motion.easing.enter),
};
export function motionFor(reduced: boolean) {
  const m = tokens.motion;
  return {
    ...m,
    reduced,
    distance: {
      ...m.distance,
      enter: reduced ? 0 : m.distance.enter,
      hero: reduced ? 0 : m.distance.hero,
      float: reduced ? 0 : m.distance.float,
    },
    scale: {
      pressed: reduced ? 1 : m.scale.pressed,
      pop: reduced ? 1 : m.scale.pop,
      selected: reduced ? 1 : m.scale.selected,
    },
    /** The one timing call: the standard curve unless named, and no motion under Reduce Motion. */
    timing(to: number, duration: Duration, curve: Curve = 'standard', done?: (finished?: boolean) => void) {
      if (reduced) {
        done?.(true);
        return to;
      }
      return withTiming(to, { duration: m.duration[duration], easing: curves[curve] }, done);
    },
  };
}
export function useMotion() {
  return motionFor(useReducedMotion());
}
