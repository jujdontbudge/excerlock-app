import { ringGeometry, distanceLabel } from '../geometry';
import { confettiPieces, particlePosition } from '../../../motion/confettiPhysics';
test('ring starts at top centre and measures rounded perimeter', () => {
  const g = ringGeometry(350);
  expect(g.path.startsWith('M 175 ')).toBe(true);
  const r = 350 * 0.13 - g.stroke / 2;
  expect(g.length).toBeCloseTo(4 * (350 - g.stroke - 2 * r) + 2 * Math.PI * r);
});
test('confetti has forty pieces and fades out completely', () => {
  expect(confettiPieces).toHaveLength(40);
  expect(particlePosition(0, 1200).opacity).toBe(1);
  expect(particlePosition(0, 1800).opacity).toBe(0);
});
test('distance copy rounds metres and kilometres', () => {
  expect(distanceLabel(144)).toBe('140 m');
  expect(distanceLabel(1532)).toBe('1.5 km');
});
