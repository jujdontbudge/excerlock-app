jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { ExecutionEnvironment } from "expo-constants";

import { getScreenTimeModule } from "..";
import {
  installScreenTimeModule,
  shouldUseNativeScreenTimeModule,
} from "../accessor";
import { MockScreenTimeModule } from "../MockScreenTimeModule";

const runtimeCases = [
  {
    name: "tests",
    runtime: {
      nodeEnv: "test",
      platform: "ios",
      executionEnvironment: ExecutionEnvironment.Standalone,
      expoGoConfig: null,
    },
    expected: false,
  },
  {
    name: "Expo Go on iOS",
    runtime: {
      nodeEnv: "development",
      platform: "ios",
      executionEnvironment: ExecutionEnvironment.StoreClient,
      expoGoConfig: {},
    },
    expected: false,
  },
  {
    name: "an iOS development client",
    runtime: {
      nodeEnv: "development",
      platform: "ios",
      executionEnvironment: ExecutionEnvironment.StoreClient,
      expoGoConfig: null,
    },
    expected: true,
  },
  {
    name: "an iOS Standalone release",
    runtime: {
      nodeEnv: "production",
      platform: "ios",
      executionEnvironment: ExecutionEnvironment.Standalone,
      expoGoConfig: null,
    },
    expected: true,
  },
  {
    name: "an iOS bare runtime",
    runtime: {
      nodeEnv: "production",
      platform: "ios",
      executionEnvironment: ExecutionEnvironment.Bare,
      expoGoConfig: null,
    },
    expected: true,
  },
  {
    name: "an unfamiliar iOS execution environment",
    runtime: {
      nodeEnv: "production",
      platform: "ios",
      executionEnvironment: "future-environment" as ExecutionEnvironment,
      expoGoConfig: null,
    },
    expected: true,
  },
  {
    name: "a non-iOS runtime",
    runtime: {
      nodeEnv: "production",
      platform: "android",
      executionEnvironment: ExecutionEnvironment.Standalone,
      expoGoConfig: null,
    },
    expected: false,
  },
] as const;

describe("ScreenTime composition seam", () => {
  it("returns one module instance from the Phase-3 swap point", () => {
    expect(getScreenTimeModule()).toBe(getScreenTimeModule());
  });

  it("lets the E2E runtime install a scenario module and restore on uninstall", () => {
    const before = getScreenTimeModule();
    const scenarioModule = new MockScreenTimeModule();

    const uninstall = installScreenTimeModule(scenarioModule);
    expect(getScreenTimeModule()).toBe(scenarioModule);

    uninstall();
    expect(getScreenTimeModule()).toBe(before);
  });

  it("ignores an uninstall after a newer module was installed", () => {
    const first = new MockScreenTimeModule();
    const second = new MockScreenTimeModule();

    const uninstallFirst = installScreenTimeModule(first);
    installScreenTimeModule(second);
    uninstallFirst();

    expect(getScreenTimeModule()).toBe(second);
  });

  it.each(runtimeCases)("selects the expected adapter for $name", (testCase) => {
    expect(shouldUseNativeScreenTimeModule(testCase.runtime)).toBe(
      testCase.expected,
    );
  });

  it("fails loudly if an iOS Standalone release would select the mock", () => {
    expect(() =>
      shouldUseNativeScreenTimeModule({
        nodeEnv: "production",
        platform: "ios",
        executionEnvironment: ExecutionEnvironment.Standalone,
        expoGoConfig: {},
      }),
    ).toThrow("Refusing to start an iOS release with mock Screen Time");
  });
});
