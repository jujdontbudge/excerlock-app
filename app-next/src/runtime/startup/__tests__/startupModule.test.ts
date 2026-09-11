// Preserve jest-expo's other native exports: its lazy fetch global can resolve
// after these isolated imports (including during Jest's Node 22 teardown).
const mockExpoModulesCore = jest.requireMock('expo-modules-core');

afterEach(() => {
  jest.doMock('expo-modules-core', () => mockExpoModulesCore);
});

test('a missing native module reports unavailable without throwing', () => {
  jest.isolateModules(() => {
    jest.doMock('expo-modules-core', () => ({
      ...mockExpoModulesCore,
      requireOptionalNativeModule: () => null,
    }));
    const { markInteractiveHome } = require('../../../../modules/excerlock-startup');
    expect(markInteractiveHome()).toBe(false);
  });
});

test('a throwing native module reports unavailable without throwing', () => {
  jest.isolateModules(() => {
    jest.doMock('expo-modules-core', () => ({
      ...mockExpoModulesCore,
      requireOptionalNativeModule: () => ({ markInteractiveHome: () => { throw new Error('native failure'); } }),
    }));
    const { markInteractiveHome } = require('../../../../modules/excerlock-startup');
    expect(markInteractiveHome()).toBe(false);
  });
});
