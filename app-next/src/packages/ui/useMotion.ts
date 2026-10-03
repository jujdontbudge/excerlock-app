import {
  cubicBezier,
  Easing,
  useReducedMotion,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type CSSAnimationFillMode,
  type CSSAnimationKeyframes,
  type CSSAnimationProperties,
  type CSSTransitionProperties,
} from 'react-native-reanimated';
import { useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { tokens } from './tokens';
type Duration = keyof typeof tokens.motion.duration;
type Curve = keyof typeof tokens.motion.easing;
type Spring = keyof typeof tokens.motion.spring;
type Done = (finished?: boolean) => void;
type StyleKey = keyof ViewStyle;
type Transition = Partial<CSSTransitionProperties<ViewStyle>>;
type Keyframes = Partial<CSSAnimationProperties<ViewStyle>>;
const curves: Record<Curve, ReturnType<typeof Easing.bezier>> = {
  standard: Easing.bezier(...tokens.motion.easing.standard),
  enter: Easing.bezier(...tokens.motion.easing.enter),
  steady: Easing.bezier(...tokens.motion.easing.steady),
};
const cssCurve = (curve: Curve) => {
  const [x1, y1, x2, y2] = tokens.motion.easing[curve];
  return cubicBezier(x1, y1, x2, y2);
};
const stillProperties = new Set<StyleKey>(['opacity', 'backgroundColor', 'borderColor']);
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
    timing(to: number, duration: Duration, options: { curve?: Curve; stretch?: number; done?: Done } = {}) {
      'worklet';
      if (reduced) {
        options.done?.(true);
        return to;
      }
      return withTiming(
        to,
        { duration: m.duration[duration] * (options.stretch ?? 1), easing: curves[options.curve ?? 'standard'] },
        options.done,
      );
    },
    spring(to: number, spring: Spring, done?: Done) {
      'worklet';
      if (reduced) {
        done?.(true);
        return to;
      }
      return withSpring(to, m.spring[spring], done);
    },
    delay<T>(ms: number, animation: T) {
      return reduced ? animation : (withDelay(ms, animation as never) as T);
    },
    sequence<T>(...animations: [T, ...T[]]) {
      return reduced ? animations[animations.length - 1] : (withSequence(...(animations as unknown as never[])) as T);
    },
    transition(
      property: StyleKey | StyleKey[],
      duration: Duration,
      options: { delay?: number; curve?: Curve } = {},
    ): Transition {
      const properties = (Array.isArray(property) ? property : [property]).filter(
        (name) => !reduced || stillProperties.has(name),
      );
      if (!properties.length) return {};
      return {
        transitionProperty: Array.isArray(property) ? properties : properties[0],
        transitionDuration: m.duration[duration],
        transitionDelay: reduced ? 0 : (options.delay ?? 0),
        transitionTimingFunction: cssCurve(options.curve ?? 'standard'),
      };
    },
    keyframes(
      frames: CSSAnimationKeyframes<ViewStyle>,
      duration: Duration,
      options: {
        delay?: number;
        fill?: CSSAnimationFillMode;
        loop?: boolean;
        spread?: number;
        curve?: Curve;
        still?: CSSAnimationKeyframes<ViewStyle>;
      } = {},
    ): Keyframes {
      const name = reduced ? options.still : frames;
      if (!name) return {};
      return {
        animationName: name,
        animationDuration: m.duration[duration] + (options.spread ?? 0),
        animationDelay: options.delay ?? 0,
        animationFillMode: options.fill ?? 'none',
        animationIterationCount: options.loop ? 'infinite' : 1,
        animationTimingFunction: cssCurve(options.curve ?? 'standard'),
      };
    },
  };
}
export function useMotion() {
  const reduced = useReducedMotion();
  return useMemo(() => motionFor(reduced), [reduced]);
}
