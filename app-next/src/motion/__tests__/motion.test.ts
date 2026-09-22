import { motionFor } from '../useMotion';
test('Reduce Motion retains fades but removes every spatial offset and scale', () => {
  const m = motionFor(true);
  expect(m.distance).toEqual({ enter: 0, hero: 0, float: 0, dismiss: 120 });
  expect(m.scale.pressed).toBe(1);
  expect(m.scale.pop).toBe(1);
  expect(m.duration.fast).toBeGreaterThan(0);
  expect(motionFor(false).distance.enter).toBe(16);
});

test('timing eases on the Material 3 standard curve, and lands immediately under Reduce Motion', () => {
  const reanimated = require('react-native-reanimated');
  const withTiming = jest.spyOn(reanimated, 'withTiming');
  expect(motionFor(true).timing(1, 'fast')).toBe(1);
  expect(withTiming).not.toHaveBeenCalled();
  motionFor(false).timing(1, 'fast');
  expect(withTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: 180, easing: expect.anything() }), undefined);
  expect(reanimated.Easing.bezier).toBeDefined();
  withTiming.mockRestore();
});
