import { impactSummary, dotState } from '../impact/model';
test('a five-hour estimate produces consistent daily/monthly/yearly and free-time quantities', () => {
  expect(impactSummary(300)).toEqual({ hours: 5, month: 150, days: 76, freeDays: 122, scrollingDots: 76 });
});
test('removing occupied days preserves exactly the free-time subset, then colors scrolling within it', () => {
  const summary = impactSummary(300);
  const states = Array.from({ length: 365 }, (_, i) => dotState(i, 'O14', summary));
  expect(states.filter(s => s.visible)).toHaveLength(122);
  expect(states.filter(s => s.scrolling)).toHaveLength(76);
  expect(states.every(s => !s.scrolling || s.visible)).toBe(true);
  expect(dotState(0, 'O12', summary).visible).toBe(true);
});
test('scrolling never colors more dots than available free time', () => {
  expect(impactSummary(720).scrollingDots).toBe(122);
});
