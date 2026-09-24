import { compactNumber } from '../format';
import { homeCopy } from '../home';
test.each([
  [3200, '3.2k'],
  [5000, '5k'],
  [1400000, '1.4m'],
  [250, '250'],
])('chart labels keep %s readable in narrow columns', (value, expected) => {
  expect(compactNumber(Number(value))).toBe(expected);
});
test('Home is always headed with the app name, never a greeting', () => {
  expect(homeCopy.title).toBe('ExcerLock');
});
