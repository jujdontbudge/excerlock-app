import { dialMinute, dialPoint, nearestHandle, boundedMinute } from '../scheduleDialMath';

test('24-hour dial maps continuously to individual minutes clockwise', () => {
  expect(dialMinute(150, 0, 150)).toBe(0);
  expect(dialMinute(300, 150, 150)).toBe(360);
  expect(dialMinute(150, 300, 150)).toBe(720);
  expect(dialMinute(0, 150, 150)).toBe(1080);
  for (const minute of [0, 1, 17, 345, 541, 719, 1261, 1439]) {
    const point = dialPoint(minute, 150, 130);
    expect(dialMinute(point.x, point.y, 150)).toBe(minute);
  }
});

test('nearest handle respects midnight and dragging cannot create a zero-length window', () => {
  expect(nearestHandle(0, 1425, 720)).toBe('start');
  expect(nearestHandle(735, 1425, 720)).toBe('end');
  expect(boundedMinute('start', 720, 540, 720)).toBe(719);
  expect(boundedMinute('end', 540, 540, 720)).toBe(541);
  expect(boundedMinute('start', 0, 540, 0)).toBe(1439);
  expect(boundedMinute('end', 0, 0, 720)).toBe(1);
  expect(boundedMinute('end', 60, 1260, 720)).toBe(60);
});
