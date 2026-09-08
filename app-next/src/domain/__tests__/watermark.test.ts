import { effectiveNow, nextWatermark } from '../watermark';

test('effectiveNow never retreats for an ordinary clock rewind', () => {
  const watermark = '2026-09-07T19:00:00.000Z';
  expect(effectiveNow('2026-09-07T18:00:00.000Z', watermark)).toBe(watermark);
  expect(effectiveNow('2026-09-07T20:00:00.000Z', watermark)).toBe('2026-09-07T20:00:00.000Z');
  expect(nextWatermark('2026-09-07T18:00:00.000Z', watermark)).toBe(watermark);
});

test('a backwards jump greater than 26 hours is treated as a legitimate restore', () => {
  const observed = '2026-09-05T12:59:59.000Z';
  const watermark = '2026-09-06T15:00:00.000Z';
  expect(effectiveNow(observed, watermark)).toBe(observed);
  expect(nextWatermark(observed, watermark)).toBe(observed);
});

test('an absent watermark starts at the observed instant', () => {
  expect(effectiveNow('2026-09-07T19:00:00.000Z', null)).toBe('2026-09-07T19:00:00.000Z');
  expect(nextWatermark('2026-09-07T19:00:00.000Z', null)).toBe('2026-09-07T19:00:00.000Z');
});
