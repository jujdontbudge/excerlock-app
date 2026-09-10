import { FixturePhonePlacementProvider } from "../../signals/placement/FixturePhonePlacementProvider";
import { createWalkingPlacementRuntime } from "../walkingPlacementRuntime";

describe("walkingPlacementRuntime selection (T01 compile-only)", () => {
  it("selects fixtures in tests", () => {
    const runtime = createWalkingPlacementRuntime(
      { nodeEnv: "test", platform: "ios", expoVersion: null },
      () => {
        throw new Error("must not create native in tests");
      },
    );
    expect(runtime.provider).toBeInstanceOf(FixturePhonePlacementProvider);
  });
});
