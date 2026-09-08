/**
 * The law this file exists to police: importing an adapter must never load a native module.
 *
 * `engine/signals` reaches `expo-modules-core`, so if any binding moved to module scope the whole
 * adapter layer would stop running under plain jest and the failure would show up as a broken test
 * environment rather than as the mistake it is. Making the engine explode on load says it plainly.
 */
jest.mock('../../engine/signals', () => {
  throw new Error('The native engine was loaded at module scope');
});

describe('native bindings', () => {
  test('importing the bindings does not load the engine', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bindings = require('../nativeEngine') as typeof import('../nativeEngine');
      expect(typeof bindings.createNativeAdapters).toBe('function');
      expect(typeof bindings.nativeMotion).toBe('function');
    });
  });

  test('calling one does', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bindings = require('../nativeEngine') as typeof import('../nativeEngine');
      expect(() => bindings.nativeMotion()).toThrow('The native engine was loaded at module scope');
    });
  });
});
