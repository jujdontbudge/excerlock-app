import { shouldUseHealthKitProvider } from "../runtimeSelection";

const devClient = {
  executionEnvironment: "storeClient",
  hasExpoGoConfig: false,
  nodeEnv: "development",
  platform: "ios",
} as const;

describe("Home HealthProvider runtime selection", () => {
  it("selects HealthKit only in an iOS dev-client runtime", () => {
    expect(shouldUseHealthKitProvider(devClient)).toBe(true);
    expect(
      shouldUseHealthKitProvider({ ...devClient, nodeEnv: "test" }),
    ).toBe(false);
    expect(
      shouldUseHealthKitProvider({ ...devClient, hasExpoGoConfig: true }),
    ).toBe(false);
    expect(
      shouldUseHealthKitProvider({
        ...devClient,
        executionEnvironment: "standalone",
      }),
    ).toBe(false);
    expect(
      shouldUseHealthKitProvider({ ...devClient, platform: "android" }),
    ).toBe(false);
  });
});
