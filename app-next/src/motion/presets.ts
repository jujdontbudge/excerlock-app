import { Easing, FadeIn, FadeOut, FadeInDown, ZoomIn, LinearTransition } from 'react-native-reanimated';
import { tokens } from '../design-system/tokens';
const m = tokens.motion;
export const fadeIn = FadeIn.duration(m.duration.standard);
export const fadeOut = FadeOut.duration(m.duration.fast);
export function slideUp(reduced: boolean, index = 0) {
  if (reduced) return FadeIn.duration(m.duration.standard).delay(index * m.stagger.list);
  return FadeInDown.withInitialValues({ translateY: m.distance.enter })
    .duration(m.duration.slow)
    .delay(index * m.stagger.list)
    .easing(Easing.bezier(...m.easing.enter));
}
export function popIn(reduced: boolean) {
  return reduced
    ? fadeIn
    : ZoomIn.withInitialValues({ scale: m.scale.pop })
        .springify()
        .mass(m.spring.pop.mass)
        .stiffness(m.spring.pop.stiffness)
        .damping(m.spring.pop.damping);
}
export const staggeredList = slideUp;
export const layoutTransition = LinearTransition.duration(m.duration.standard);
