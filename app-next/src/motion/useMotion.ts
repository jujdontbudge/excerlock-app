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
import { tokens } from '../design-system/tokens';
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
};
/** CSS timing functions for style transitions and keyframes, built on first use. */
const cssCurve = (curve: Curve) => {
  const [x1, y1, x2, y2] = tokens.motion.easing[curve];
  return cubicBezier(x1, y1, x2, y2);
};
/** Colour and opacity may still cross-fade under Reduce Motion; anything that moves or resizes may not. */
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
    /**
     * The one timing call: the standard curve unless named, and no motion under Reduce Motion.
     * `stretch` lengthens a token duration for a longer draw; it never replaces the token.
     */
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
    /** A token spring; under Reduce Motion the value lands at once. Both calls also run inside gesture worklets. */
    spring(to: number, spring: Spring, done?: Done) {
      'worklet';
      if (reduced) {
        done?.(true);
        return to;
      }
      return withSpring(to, m.spring[spring], done);
    },
    /** Starts an animation built by these helpers after a pause; no pause under Reduce Motion. */
    delay<T>(ms: number, animation: T) {
      return reduced ? animation : (withDelay(ms, animation as never) as T);
    },
    /** Plays helper-built animations in order; under Reduce Motion only the last value remains. */
    sequence<T>(...animations: [T, ...T[]]) {
      return reduced ? animations[animations.length - 1] : (withSequence(...(animations as unknown as never[])) as T);
    },
    /** Style transition props for an Animated component. */
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
    /**
     * Keyframe animation props for an Animated component. `spread` lengthens a loop so siblings drift apart;
     * under Reduce Motion the element holds still, or plays `still` (an opacity-only version) when given.
     */
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
/** Stable for as long as the Reduce Motion setting holds, so effects may depend on it. */
export function useMotion() {
  const reduced = useReducedMotion();
  return useMemo(() => motionFor(reduced), [reduced]);
}
