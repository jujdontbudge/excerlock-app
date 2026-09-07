import { distanceMetres, metresToPoints, regionForRadius, roundCoordinate, clampRadius } from '../geometry';
const chicago = { latitude: 41.884, longitude: -87.652 };
test('map geometry preserves a metric radius at Chicago latitude', () => {
  const region = regionForRadius(chicago, 100, { width: 400, height: 400 });
  expect(metresToPoints(region, 400, 100)).toBeCloseTo(400 / 2.7);
  expect(distanceMetres({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0.0089932 })).toBeCloseTo(1000, 0);
  expect(metresToPoints(regionForRadius(chicago, 200, { width: 400, height: 250 }), 400, 200)).toBeLessThan(125);
  expect(roundCoordinate(chicago)).toBe('41.8840,-87.6520');
  expect(clampRadius(500)).toBe(200);
  expect(clampRadius(146)).toBe(150);
  expect(clampRadius(-1)).toBe(50);
});
