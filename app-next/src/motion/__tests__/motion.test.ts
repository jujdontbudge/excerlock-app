import * as reanimated from 'react-native-reanimated';
import { motionFor } from '../useMotion';
import { layoutTransition, pageIn, pageOut } from '../presets';
test('Reduce Motion retains fades but removes every spatial offset and scale', () => {
  const m = motionFor(true);
  expect(m.distance).toEqual({ enter: 0, hero: 0, float: 0, dismiss: 120 });
  expect(m.scale.pressed).toBe(1);
  expect(m.scale.pop).toBe(1);
  expect(m.duration.standard).toBeGreaterThan(0);
  expect(motionFor(false).distance.enter).toBe(16);
});

test('timing eases on the Material 3 standard curve, and lands immediately under Reduce Motion', () => {
  const withTiming = jest.spyOn(reanimated, 'withTiming');
  expect(motionFor(true).timing(1, 'standard')).toBe(1);
  expect(withTiming).not.toHaveBeenCalled();
  motionFor(false).timing(1, 'standard');
  expect(withTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: 240, easing: expect.anything() }), undefined);
  expect(reanimated.Easing.bezier).toBeDefined();
  withTiming.mockRestore();
});

test('springs, delays and sequences land on their final value under Reduce Motion', () => {
  const withSpring = jest.spyOn(reanimated, 'withSpring');
  const reduced = motionFor(true);
  expect(reduced.spring(1, 'control')).toBe(1);
  expect(reduced.delay(500, reduced.timing(2, 'standard'))).toBe(2);
  expect(reduced.sequence(reduced.timing(0.9, 'standard'), reduced.spring(1, 'pop'))).toBe(1);
  expect(withSpring).not.toHaveBeenCalled();
  motionFor(false).spring(1, 'pop');
  expect(withSpring).toHaveBeenCalledWith(1, { mass: 0.8, stiffness: 240, damping: 15 }, undefined);
  withSpring.mockRestore();
});

test('style transitions ease on the standard curve; Reduce Motion keeps colour and opacity and drops movement', () => {
  const moving = motionFor(false).transition(['transform', 'backgroundColor'], 'press');
  expect(moving).toEqual(expect.objectContaining({
    transitionProperty: ['transform', 'backgroundColor'],
    transitionDuration: 100,
    transitionTimingFunction: expect.anything(),
  }));
  expect(String(moving.transitionTimingFunction)).toBe('cubicBezier(0.2, 0, 0, 1)');
  expect(motionFor(true).transition(['transform', 'backgroundColor'], 'press').transitionProperty).toEqual(['backgroundColor']);
  expect(motionFor(true).transition(['left', 'top'], 'standard')).toEqual({});
  expect(motionFor(true).transition('opacity', 'standard', { delay: 90 }).transitionDelay).toBe(0);
});

test('keyframe animations use a token duration and the standard curve, and hold still under Reduce Motion', () => {
  const frames = { from: { opacity: 0 }, to: { opacity: 1 } };
  const loop = motionFor(false).keyframes(frames, 'breathe', { loop: true, spread: 90 });
  expect(loop).toEqual(expect.objectContaining({
    animationName: frames,
    animationDuration: 3690,
    animationIterationCount: 'infinite',
  }));
  expect(String(loop.animationTimingFunction)).toBe('cubicBezier(0.2, 0, 0, 1)');
  expect(motionFor(true).keyframes(frames, 'breathe', { loop: true })).toEqual({});
  const still = { from: { opacity: 0.5 }, to: { opacity: 1 } };
  expect(motionFor(true).keyframes(frames, 'emphasized', { still }).animationName).toBe(still);
});

test('page and layout transitions are gated by Reduce Motion', () => {
  expect(layoutTransition(true)).toBeUndefined();
  expect(layoutTransition(false)).toBeDefined();
  expect(pageIn(false, 'forward')).toBeDefined();
  expect(pageOut(false, 'back')).toBeDefined();
  expect(pageIn(true, 'forward')).not.toBe(pageIn(false, 'forward'));
});
