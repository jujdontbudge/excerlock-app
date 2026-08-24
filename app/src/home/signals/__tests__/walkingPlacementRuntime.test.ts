import { FixturePhonePlacementProvider } from "@/signals";

import { createWalkingPlacementRuntime } from "../walkingPlacementRuntime";

describe("walking placement runtime selection", () => {
  it("keeps placement fixtures as the test default", () => {
    const createNative = jest.fn();

    const provider = createWalkingPlacementRuntime(
      {
        executionEnvironment: "storeClient",
        hasExpoGoConfig: false,
        nodeEnv: "test",
        platform: "ios",
      },
      createNative,
    );

    expect(provider).toBeInstanceOf(FixturePhonePlacementProvider);
    expect(createNative).not.toHaveBeenCalled();
  });

  it("selects native placement sensing in an iOS Standalone release", () => {
    const native = {} as never;
    const createNative = jest.fn(() => native);

    const provider = createWalkingPlacementRuntime(
      {
        executionEnvironment: "standalone",
        hasExpoGoConfig: false,
        nodeEnv: "production",
        platform: "ios",
      },
      createNative,
    );

    expect(provider).toBe(native);
    expect(createNative).toHaveBeenCalledTimes(1);
  });
});
