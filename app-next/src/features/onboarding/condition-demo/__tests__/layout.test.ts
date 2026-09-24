import { demoRows, sceneGeometry } from '../layout';
// Promise card: top 70 + height 72 in screen points; Continue plus home indicator: about 98 points.
const promiseBottom = 142;
const footerTop = (height: number) => height - 98;
test.each([
  [375, 667],
  [393, 852],
  [402, 874],
  [440, 956],
])('a %s × %s screen keeps every card clear of the promise card and the Continue button', (width, height) => {
  const g = sceneGeometry(width, height);
  const at = (y: number) => g.top + y * g.scale;
  expect(at(demoRows.column)).toBeGreaterThanOrEqual(promiseBottom + 8);
  expect(at(demoRows.below + demoRows.belowHeight)).toBeLessThanOrEqual(footerTop(height) - 8);
  // The walking character stands on the same ground line as before.
  expect(g.top + (g.height - 112) * g.scale).toBeCloseTo(height - 112 * g.scale);
  expect(g.left).toBeGreaterThanOrEqual(-1e-9);
  expect(g.left + 400 * g.scale).toBeLessThanOrEqual(width + 1e-9);
});
