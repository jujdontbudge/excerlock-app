import {
  Easing,
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeOutDown,
  ZoomIn,
  LinearTransition,
  ReduceMotion,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { tokens } from '../design-system/tokens';
const m = tokens.motion;
type Duration = keyof typeof m.duration;
const standard = Easing.bezier(...m.easing.standard);
export const opacityIn = (duration: Duration = 'standard', delay = 0) =>
  FadeIn.duration(m.duration[duration]).delay(delay).easing(standard).reduceMotion(ReduceMotion.Never);
export const fadeIn = opacityIn();
export const opacityOut = (duration: Duration = 'standard') =>
  FadeOut.duration(m.duration[duration]).easing(standard).reduceMotion(ReduceMotion.Never);
export const fadeOut = opacityOut();
export function slideUp(reduced: boolean, index = 0) {
  if (reduced) return opacityIn('standard', index * m.stagger.list);
  return FadeInDown.withInitialValues({ translateY: m.distance.enter })
    .duration(m.duration.standard)
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
type Direction = 'forward' | 'back';
export function pageIn(reduced: boolean, direction: Direction) {
  if (reduced) return opacityIn();
  return (direction === 'forward' ? SlideInRight : SlideInLeft).duration(m.duration.emphasized).easing(standard);
}
export function pageOut(reduced: boolean, direction: Direction) {
  if (reduced) return opacityOut();
  return (direction === 'forward' ? SlideOutLeft : SlideOutRight).duration(m.duration.standard).easing(standard);
}
export function sheetOut(reduced: boolean) {
  return reduced ? opacityOut() : FadeOutDown.duration(m.duration.emphasized).easing(standard);
}
export function layoutTransition(reduced: boolean) {
  return reduced ? undefined : LinearTransition.duration(m.duration.standard).easing(standard);
}
