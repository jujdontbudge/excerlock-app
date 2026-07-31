jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { ExecutionEnvironment } from "expo-constants";

import { getScreenTimeModule } from "..";
import { shouldUseNativeScreenTimeModule } from "../accessor";

describe("ScreenTime composition seam", () => {
  it("returns one module instance from the Phase-3 swap point", () => {
    expect(getScreenTimeModule()).toBe(getScreenTimeModule());
  });

  it("selects the real adapter only for an iOS development client", () => {
    const developmentClient = {
      nodeEnv: "development",
      platform: "ios",
      executionEnvironment: ExecutionEnvironment.StoreClient,
      expoGoConfig: null,
    } as const;

    expect(shouldUseNativeScreenTimeModule(developmentClient)).toBe(true);
    expect(
      shouldUseNativeScreenTimeModule({
        ...developmentClient,
        nodeEnv: "test",
      }),
    ).toBe(false);
    expect(
      shouldUseNativeScreenTimeModule({
        ...developmentClient,
        platform: "android",
      }),
    ).toBe(false);
    expect(
      shouldUseNativeScreenTimeModule({
        ...developmentClient,
        expoGoConfig: {},
      }),
    ).toBe(false);
  });
});
