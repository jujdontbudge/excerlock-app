import { Easing, FadeIn, FadeOut, FadeInDown, ZoomIn, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { tokens } from '../design-system/tokens';
const m = tokens.motion;
export const opacityIn = (duration: number = m.duration.standard) =>
  FadeIn.duration(duration).reduceMotion(ReduceMotion.Never);
export const fadeIn = opacityIn();
export const opacityOut = (duration: number = m.duration.fast) =>
  FadeOut.duration(duration).reduceMotion(ReduceMotion.Never);
export const fadeOut = opacityOut();
export function slideUp(reduced: boolean, index = 0) {
  if (reduced) return opacityIn().delay(index * m.stagger.list);
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
