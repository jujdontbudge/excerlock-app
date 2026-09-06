import { useReducedMotion } from 'react-native-reanimated';
import { tokens } from '../design-system/tokens';
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
  };
}
export function useMotion() {
  return motionFor(useReducedMotion());
}
