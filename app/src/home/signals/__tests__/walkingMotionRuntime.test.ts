import { FixtureMotionProvider } from "@/signals";

import { createWalkingMotionRuntime } from "../walkingMotionRuntime";

describe("walking motion runtime selection", () => {
  it("keeps fixtures as the test and non-dev-client default", () => {
    const createNative = jest.fn();

    const runtime = createWalkingMotionRuntime(
      {
        nodeEnv: "test",
        platform: "ios",
        expoVersion: null,
      },
      createNative,
    );

    expect(runtime.provider).toBeInstanceOf(FixtureMotionProvider);
    expect(runtime.now()).toBe(0);
    expect(createNative).not.toHaveBeenCalled();
  });

  it("selects native motion in an embedded iOS Release build", () => {
    const native = {} as never;
    const createNative = jest.fn(() => native);

    const runtime = createWalkingMotionRuntime(
      {
        nodeEnv: "production",
        platform: "ios",
        expoVersion: undefined,
      },
      createNative,
    );

    expect(runtime.provider).toBe(native);
    expect(createNative).toHaveBeenCalledTimes(1);
  });
});
