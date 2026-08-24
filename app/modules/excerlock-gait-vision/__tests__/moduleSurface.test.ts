const mockNativeModule = { start: jest.fn() };
const mockRequireNativeModule = jest.fn(() => mockNativeModule);

jest.mock("expo", () => ({
  NativeModule: class {},
  requireNativeModule: mockRequireNativeModule,
}));

describe("excerlock-gait-vision module surface", () => {
  it("loads the camera module only when the dev-client composition root asks", () => {
    const moduleSurface = require("../index") as {
      getExcerlockGaitVisionModule(): typeof mockNativeModule;
    };

    expect(mockRequireNativeModule).not.toHaveBeenCalled();
    expect(moduleSurface.getExcerlockGaitVisionModule()).toBe(mockNativeModule);
    expect(mockRequireNativeModule).toHaveBeenCalledWith("ExcerlockGaitVision");
  });
});
