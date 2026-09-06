import { compactNumber } from '../format';
test.each([
  [3200, '3.2k'],
  [5000, '5k'],
  [1400000, '1.4m'],
  [250, '250'],
])('chart labels keep %s readable in narrow columns', (value, expected) => {
  expect(compactNumber(Number(value))).toBe(expected);
});
