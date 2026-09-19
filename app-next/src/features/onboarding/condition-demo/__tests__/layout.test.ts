import { sceneGeometry } from '../layout';
test.each([
  [327, 300],
  [354, 440],
  [382, 520],
])('fits a %s × %s stage without floating feet or overlapping status/timeline', (width, height) => {
  const g = sceneGeometry(width, height);
  const phoneTop = g.top + 76 * g.scale;
  const phoneBottom = g.top + (76 + 312) * g.scale;
  const feet = g.top + (g.height - 52) * g.scale;
  expect(phoneTop).toBeCloseTo(76);
  expect(phoneBottom).toBeLessThanOrEqual(height - 40 + 0.0001);
  expect(feet).toBeCloseTo(height - 52);
  expect(g.left + 170 * g.scale).toBeLessThan(g.left + 216 * g.scale);
  expect(g.left).toBeGreaterThanOrEqual(0);
  expect(g.left + 400 * g.scale).toBeLessThanOrEqual(width);
});
