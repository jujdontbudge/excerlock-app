const mockNativeModule = { start: jest.fn() };
const mockRequireNativeModule = jest.fn(() => mockNativeModule);

jest.mock("expo", () => ({
  NativeModule: class {},
  requireNativeModule: mockRequireNativeModule,
}));

describe("excerlock-motion module surface", () => {
  it("loads the native module only when a dev-client composition root asks", () => {
    const moduleSurface = require("../index") as {
      getExcerlockMotionModule(): typeof mockNativeModule;
    };

    expect(mockRequireNativeModule).not.toHaveBeenCalled();
    expect(moduleSurface.getExcerlockMotionModule()).toBe(mockNativeModule);
    expect(mockRequireNativeModule).toHaveBeenCalledWith("ExcerlockMotion");
  });
});
