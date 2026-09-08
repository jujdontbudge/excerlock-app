import { FixturePhonePlacementProvider } from "../../signals";

import { createWalkingPlacementRuntime } from "../walkingPlacementRuntime";

describe("walking placement runtime selection", () => {
  it("keeps placement fixtures as the test default", () => {
    const createNative = jest.fn();

    const provider = createWalkingPlacementRuntime(
      {
        nodeEnv: "test",
        platform: "ios",
        expoVersion: null,
      },
      createNative,
    );

    expect(provider).toBeInstanceOf(FixturePhonePlacementProvider);
    expect(createNative).not.toHaveBeenCalled();
  });

  it("selects native placement sensing in an embedded iOS Release build", () => {
    const native = {} as never;
    const createNative = jest.fn(() => native);

    const provider = createWalkingPlacementRuntime(
      {
        nodeEnv: "production",
        platform: "ios",
        expoVersion: undefined,
      },
      createNative,
    );

    expect(provider).toBe(native);
    expect(createNative).toHaveBeenCalledTimes(1);
  });
});
