import { FixtureLocationProvider } from "..";
import {
  getLocationProvider,
  shouldUseNativeLocationProvider,
} from "../accessor";

const developmentClient = {
  nodeEnv: "development",
  platform: "ios",
  executionEnvironment: "storeClient",
  expoGoConfig: null,
} as const;

describe("LocationProvider composition seam", () => {
  it("keeps a manual-check-in fixture as the singleton test default", async () => {
    expect(getLocationProvider()).toBe(getLocationProvider());
    expect(getLocationProvider()).toBeInstanceOf(FixtureLocationProvider);
    await expect(
      getLocationProvider().checkIn({
        id: "gym-a",
        latitude: 40.741,
        longitude: -73.989,
        radiusMeters: 100,
      }),
    ).resolves.toBe(false);
  });

  it("selects native location for every non-Expo-Go iOS app runtime", () => {
    expect(shouldUseNativeLocationProvider(developmentClient)).toBe(true);
    expect(
      shouldUseNativeLocationProvider({
        ...developmentClient,
        nodeEnv: "test",
      }),
    ).toBe(false);
    expect(
      shouldUseNativeLocationProvider({
        ...developmentClient,
        platform: "android",
      }),
    ).toBe(false);
    expect(
      shouldUseNativeLocationProvider({
        ...developmentClient,
        executionEnvironment: "standalone",
      }),
    ).toBe(true);
    expect(
      shouldUseNativeLocationProvider({
        ...developmentClient,
        executionEnvironment: "future-runtime",
      }),
    ).toBe(true);
    expect(
      shouldUseNativeLocationProvider({
        ...developmentClient,
        expoGoConfig: {},
      }),
    ).toBe(false);
  });
});
