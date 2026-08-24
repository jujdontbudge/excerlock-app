const mockNativeModule = { start: jest.fn() };
const mockRequireNativeModule = jest.fn(() => mockNativeModule);
const mockPreview = () => null;
const mockRequireNativeViewManager = jest.fn(() => mockPreview);

jest.mock("expo", () => ({
  NativeModule: class {},
  requireNativeModule: mockRequireNativeModule,
}));

jest.mock("expo-modules-core", () => ({
  ...jest.requireActual("expo-modules-core"),
  requireNativeViewManager: mockRequireNativeViewManager,
}));

describe("excerlock-gait-vision module surface", () => {
  it("loads the camera module only when the dev-client composition root asks", () => {
    const moduleSurface = require("../index") as {
      getExcerlockGaitVisionModule(): typeof mockNativeModule;
      getExcerlockGaitVisionPreview(): typeof mockPreview;
    };

    expect(mockRequireNativeModule).not.toHaveBeenCalled();
    expect(mockRequireNativeViewManager).not.toHaveBeenCalled();
    expect(moduleSurface.getExcerlockGaitVisionModule()).toBe(mockNativeModule);
    expect(mockRequireNativeModule).toHaveBeenCalledWith("ExcerlockGaitVision");
    expect(moduleSurface.getExcerlockGaitVisionPreview()).toBe(mockPreview);
    expect(mockRequireNativeViewManager).toHaveBeenCalledWith(
      "ExcerlockGaitVision",
    );
  });
});
