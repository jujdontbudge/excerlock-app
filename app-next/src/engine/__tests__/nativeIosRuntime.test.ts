import { shouldUseNativeIosRuntime } from "../nativeIosRuntime";

describe("native iOS runtime selection", () => {
  it("uses native modules in a bare Release build even when expoGoConfig exposes its embedded manifest", () => {
    const bareRelease = {
      nodeEnv: "production",
      platform: "ios",
      expoVersion: null,
      executionEnvironment: "bare",
      expoGoConfig: { name: "embedded app manifest" },
    };

    expect(shouldUseNativeIosRuntime(bareRelease)).toBe(true);
  });

  it("uses native modules when the bare iOS constants service omits expoVersion", () => {
    expect(
      shouldUseNativeIosRuntime({
        nodeEnv: "production",
        platform: "ios",
        expoVersion: undefined,
      }),
    ).toBe(true);
  });

  it("does not load custom native modules inside Expo Go", () => {
    expect(
      shouldUseNativeIosRuntime({
        nodeEnv: "development",
        platform: "ios",
        expoVersion: "57.0.0",
      }),
    ).toBe(false);
  });

  it("loads custom native modules in an iOS development client", () => {
    expect(
      shouldUseNativeIosRuntime({
        nodeEnv: "development",
        platform: "ios",
        expoVersion: null,
      }),
    ).toBe(true);
  });

  it("keeps tests and non-iOS runtimes on their fixtures", () => {
    expect(
      shouldUseNativeIosRuntime({
        nodeEnv: "test",
        platform: "ios",
        expoVersion: null,
      }),
    ).toBe(false);
    expect(
      shouldUseNativeIosRuntime({
        nodeEnv: "production",
        platform: "android",
        expoVersion: null,
      }),
    ).toBe(false);
  });
});
