import { deviceLocale, formatDate, formatNumber, setLocaleForTests, weekOrder } from '../locale';

afterEach(() => setLocaleForTests({ tag: 'en-US', hour12: true, weekStart: 1 }));

test('the test fixture pins an en-US, 12-hour, Monday-start device', () => {
  expect(deviceLocale()).toEqual({ tag: 'en-US', hour12: true, weekStart: 1 });
  expect(weekOrder()).toEqual([1, 2, 3, 4, 5, 6, 0]);
});

test('unpinned detection reads the clock and week start from Intl', () => {
  setLocaleForTests({ tag: 'de-DE' });
  expect(deviceLocale()).toEqual({ tag: 'de-DE', hour12: false, weekStart: 1 });
  setLocaleForTests({ tag: 'en-US' });
  expect(deviceLocale()).toEqual({ tag: 'en-US', hour12: true, weekStart: 0 });
  setLocaleForTests({ tag: 'ar-EG' });
  expect(deviceLocale().weekStart).toBe(6);
});

test('week order starts on the device first day', () => {
  expect(weekOrder(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  expect(weekOrder(6)).toEqual([6, 0, 1, 2, 3, 4, 5]);
});

test('numbers and dates follow the device locale', () => {
  expect(formatNumber(5000)).toBe('5,000');
  setLocaleForTests({ tag: 'de-DE', hour12: false, weekStart: 1 });
  expect(formatNumber(5000)).toBe('5.000');
  expect(formatNumber(2.5, { maximumFractionDigits: 1 })).toBe('2,5');
  expect(formatDate('2026-09-07T21:00:00Z', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })).toBe('21:00');
  setLocaleForTests({ tag: 'en-US', hour12: false, weekStart: 0 });
  expect(formatDate('2026-09-07T21:00:00Z', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })).toBe('21:00');
  setLocaleForTests({ tag: 'en-US', hour12: true, weekStart: 0 });
  expect(formatDate('2026-09-07T21:00:00Z', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })).toBe('9:00 PM');
  expect(formatDate('2026-09-07T21:00:00Z', { weekday: 'long', timeZone: 'UTC' })).toBe('Monday');
});
