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
  it("keeps fixtures as the singleton test default", () => {
    expect(getLocationProvider()).toBe(getLocationProvider());
    expect(getLocationProvider()).toBeInstanceOf(FixtureLocationProvider);
  });

  it("selects native location only for an iOS development client", () => {
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
    ).toBe(false);
    expect(
      shouldUseNativeLocationProvider({
        ...developmentClient,
        expoGoConfig: {},
      }),
    ).toBe(false);
  });
});
