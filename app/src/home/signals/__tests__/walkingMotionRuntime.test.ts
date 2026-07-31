import { FixtureMotionProvider } from "@/signals";

import { createWalkingMotionRuntime } from "../walkingMotionRuntime";

describe("walking motion runtime selection", () => {
  it("keeps fixtures as the test and non-dev-client default", () => {
    const createNative = jest.fn();

    const runtime = createWalkingMotionRuntime(
      {
        executionEnvironment: "storeClient",
        hasExpoGoConfig: false,
        nodeEnv: "test",
        platform: "ios",
      },
      createNative,
    );

    expect(runtime.provider).toBeInstanceOf(FixtureMotionProvider);
    expect(runtime.now()).toBe(0);
    expect(createNative).not.toHaveBeenCalled();
  });

  it("selects native motion in an iOS Standalone release", () => {
    const native = {} as never;
    const createNative = jest.fn(() => native);

    const runtime = createWalkingMotionRuntime(
      {
        executionEnvironment: "standalone",
        hasExpoGoConfig: false,
        nodeEnv: "production",
        platform: "ios",
      },
      createNative,
    );

    expect(runtime.provider).toBe(native);
    expect(createNative).toHaveBeenCalledTimes(1);
  });
});
