import { motionFor } from '../useMotion';
test('Reduce Motion retains fades but removes every spatial offset and scale', () => {
  const m = motionFor(true);
  expect(m.distance).toEqual({ enter: 0, hero: 0, float: 0, dismiss: 120 });
  expect(m.scale.pressed).toBe(1);
  expect(m.scale.pop).toBe(1);
  expect(m.duration.fast).toBeGreaterThan(0);
  expect(motionFor(false).distance.enter).toBe(16);
});
