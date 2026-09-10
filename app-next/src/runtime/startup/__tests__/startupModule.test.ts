test('a missing native module reports unavailable without throwing', () => {
  jest.isolateModules(() => {
    jest.doMock('expo-modules-core', () => ({ requireOptionalNativeModule: () => null }));
    const { markInteractiveHome } = require('../../../../modules/excerlock-startup');
    expect(markInteractiveHome()).toBe(false);
  });
});

test('a throwing native module reports unavailable without throwing', () => {
  jest.isolateModules(() => {
    jest.doMock('expo-modules-core', () => ({
      requireOptionalNativeModule: () => ({ markInteractiveHome: () => { throw new Error('native failure'); } }),
    }));
    const { markInteractiveHome } = require('../../../../modules/excerlock-startup');
    expect(markInteractiveHome()).toBe(false);
  });
});
