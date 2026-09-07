import { timelineSegments } from '../timelineSegments';
test('9 AM to 9 PM occupies the middle 50 percent of a full day', () => {
  expect(timelineSegments({ kind: 'range', startMinute: 540, endMinute: 1260 })).toEqual([{ left: 37.5, width: 50 }]);
});
test('overnight windows highlight both sides of midnight', () => {
  expect(timelineSegments({ kind: 'range', startMinute: 1200, endMinute: 120 })).toEqual([
    { left: 0, width: (120 / 1440) * 100 },
    { left: (1200 / 1440) * 100, width: (240 / 1440) * 100 },
  ]);
});
test('all-day windows highlight the entire day', () => {
  expect(timelineSegments({ kind: 'allDay' })).toEqual([{ left: 0, width: 100 }]);
});
