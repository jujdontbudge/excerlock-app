import { createWalkingMotionRuntime } from "../walkingMotionRuntime";
import { FixtureMotionProvider } from "../../signals/motion/FixtureMotionProvider";
import { NativeMotionProvider } from "../../signals/motion/NativeMotionProvider";

describe("walkingMotionRuntime selection (T01 compile-only)", () => {
  it("selects fixtures in tests", () => {
    const runtime = createWalkingMotionRuntime(
      { nodeEnv: "test", platform: "ios", expoVersion: null },
      () => {
        throw new Error("must not create native in tests");
      },
    );
    expect(runtime.provider).toBeInstanceOf(FixtureMotionProvider);
  });

  it("selects native in a real iOS build", () => {
    const fakeNative = {} as NativeMotionProvider;
    const runtime = createWalkingMotionRuntime(
      { nodeEnv: "production", platform: "ios", expoVersion: null },
      () => fakeNative,
    );
    expect(runtime.provider).toBe(fakeNative);
  });
});
