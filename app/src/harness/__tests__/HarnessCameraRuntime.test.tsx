import { View } from "react-native";

import {
  createHarnessCameraRuntime,
  type HarnessCameraRuntime,
} from "../HarnessCameraRuntime";

describe("HarnessCameraRuntime", () => {
  it("loads the real preview and capture module in a bare iOS Release build", async () => {
    const beginHarnessCapture = jest.fn(async () => "file:///capture.mov");
    const client = {
      start: jest.fn(async () => undefined),
      stop: jest.fn(async () => undefined),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      beginHarnessCapture,
      endHarnessCapture: jest.fn(async () => undefined),
      deleteHarnessCaptures: jest.fn(async () => undefined),
    };

    const runtime = createHarnessCameraRuntime(
      { nodeEnv: "production", platform: "ios", expoVersion: null },
      () => ({ client, Preview: View }),
    );

    expect(runtime.Preview).toBe(View);
    await expect(runtime.capture.begin("c1-123")).resolves.toBe(
      "file:///capture.mov",
    );
    expect(beginHarnessCapture).toHaveBeenCalledWith("c1-123");
  });
});
