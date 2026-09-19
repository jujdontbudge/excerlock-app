import { demoTestControl } from '../testingPort';
test('production rejects all scene control input', () => {
  expect(demoTestControl(false, { demoTime: '7', demoPause: '1' }, 11)).toBeNull();
});
test('preview accepts a bounded deterministic seek and pause', () => {
  expect(demoTestControl(true, { demoTime: '7', demoPause: '1' }, 11)).toEqual({ time: 7, paused: true });
});
test.each(['NaN', '-1', '11', 'Infinity', '1e12', ''])('invalid seek fails closed: %s', (demoTime) => {
  expect(demoTestControl(true, { demoTime, demoPause: '1' }, 11)).toBeNull();
});
