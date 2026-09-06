import { ReduceMotion } from 'react-native-reanimated';
import { fadeIn, fadeOut, slideUp, popIn } from '../presets';
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mock = require('react-native-reanimated/mock');
  for (const key of ['FadeIn','FadeOut']) {
    const builder = mock[key];
    builder.reduceMotion = function(value: string) { this.motionMode = value; return this; };
    builder.getReduceMotion = function() { return this.motionMode ?? mock.ReduceMotion.System; };
  }
  return mock;
});
test('opacity fallbacks are not skipped by the system Reduce Motion policy', () => {
  for (const animation of [fadeIn, fadeOut, slideUp(true), popIn(true)])
    expect(animation.getReduceMotion()).toBe(ReduceMotion.Never);
});
