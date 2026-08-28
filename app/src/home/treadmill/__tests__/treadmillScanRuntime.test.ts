import { NativeGaitVisionProvider } from "@/signals";

import { createTreadmillScanRuntime } from "../treadmillScanRuntime";

describe("treadmill scan runtime selection", () => {
  it("does not load the native camera outside an iOS native build", async () => {
    const createNative = jest.fn();
    const runtime = createTreadmillScanRuntime(
      {
        nodeEnv: "test",
        platform: "ios",
        expoVersion: null,
      },
      createNative,
    );

    expect(createNative).not.toHaveBeenCalled();
    await expect(runtime.provider.start()).rejects.toMatchObject({
      code: "ERR_GAIT_VISION_DENIED",
    });
  });

  it("selects the native provider and preview for an embedded iOS Release build", () => {
    const Preview = () => null;
    const client = {
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
    };
    const createNative = jest.fn(() => ({ client, Preview }));

    const runtime = createTreadmillScanRuntime(
      {
        nodeEnv: "production",
        platform: "ios",
        expoVersion: undefined,
      },
      createNative,
    );

    expect(runtime.provider).toBeInstanceOf(NativeGaitVisionProvider);
    expect(runtime.Preview).toBe(Preview);
  });
});
