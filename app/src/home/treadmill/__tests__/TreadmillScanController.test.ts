import {
  FixtureGaitVisionProvider,
  type GaitKeypointSample,
  type GaitVisionProvider,
} from "@/signals";

import { TreadmillScanController } from "../TreadmillScanController";

function bodySample(timestampMs: number, verticalOffset = 0): GaitKeypointSample {
  return {
    timestampMs,
    landmarks: {
      leftShoulder: { x: 0.4, y: 0.3 + verticalOffset, confidence: 0.95 },
      rightShoulder: { x: 0.6, y: 0.3 + verticalOffset, confidence: 0.95 },
      leftHip: { x: 0.45, y: 0.6 + verticalOffset, confidence: 0.95 },
      rightHip: { x: 0.55, y: 0.6 + verticalOffset, confidence: 0.95 },
    },
  };
}

function walkingSamples(startAtMs = 0, durationMs = 3_000): GaitKeypointSample[] {
  const samples: GaitKeypointSample[] = [];
  for (let elapsedMs = 0; elapsedMs <= durationMs; elapsedMs += 50) {
    const phase = (elapsedMs / 1_000) * 2 * Math.PI * 2;
    samples.push(
      bodySample(startAtMs + elapsedMs, Math.sin(phase) * 0.02),
    );
  }
  return samples;
}

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("TreadmillScanController", () => {
  it("publishes running confidence and completes as soon as gait verifies", async () => {
    const provider = new FixtureGaitVisionProvider(walkingSamples());
    const onVerified = jest.fn().mockResolvedValue(undefined);
    const controller = new TreadmillScanController({
      provider,
      now: () => 0,
      onVerified,
      onPermissionDenied: async () => {},
      onExpired: async () => {},
    });
    await controller.start();

    provider.advanceTo(800);
    expect(controller.getSnapshot()).toMatchObject({
      phase: "scanning",
      confidence: 0.25,
    });

    provider.advanceTo(3_000);
    await flushAsyncWork();

    expect(controller.getSnapshot()).toEqual({
      phase: "verified",
      confidence: 1,
    });
    expect(onVerified).toHaveBeenCalledTimes(1);
  });

  it("keeps scanning with the framing failure for 30 seconds before expiring", async () => {
    jest.useFakeTimers({ now: 0 });
    const provider = new FixtureGaitVisionProvider([]);
    const onExpired = jest.fn().mockResolvedValue(undefined);
    const controller = new TreadmillScanController({
      provider,
      now: Date.now,
      onVerified: async () => {},
      onPermissionDenied: async () => {},
      onExpired,
    });
    await controller.start();

    await jest.advanceTimersByTimeAsync(5_000);
    expect(controller.getSnapshot()).toEqual({
      phase: "needsFraming",
      confidence: 0,
    });

    await jest.advanceTimersByTimeAsync(29_999);
    expect(onExpired).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(controller.getSnapshot()).toEqual({
      phase: "expired",
      confidence: 0,
    });
    expect(onExpired).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it("recovers automatically when the user steps into frame during failure grace", async () => {
    jest.useFakeTimers({ now: 0 });
    const provider = new FixtureGaitVisionProvider(walkingSamples(5_000));
    const onVerified = jest.fn().mockResolvedValue(undefined);
    const controller = new TreadmillScanController({
      provider,
      now: Date.now,
      onVerified,
      onPermissionDenied: async () => {},
      onExpired: async () => {},
    });
    await controller.start();
    await jest.advanceTimersByTimeAsync(5_000);

    provider.advanceTo(8_000);
    await flushAsyncWork();

    expect(controller.getSnapshot().phase).toBe("verified");
    expect(onVerified).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it("reports denied permission through the handheld fallback seam", async () => {
    const denied = Object.assign(new Error("Camera access was denied"), {
      code: "ERR_GAIT_VISION_DENIED",
    });
    const provider: GaitVisionProvider = {
      start: jest.fn().mockRejectedValue(denied),
      stop: jest.fn().mockResolvedValue(undefined),
      onSample: jest.fn(() => () => {}),
    };
    const onPermissionDenied = jest.fn().mockResolvedValue(undefined);
    const controller = new TreadmillScanController({
      provider,
      now: () => 0,
      onVerified: async () => {},
      onPermissionDenied,
      onExpired: async () => {},
    });

    await controller.start();

    expect(controller.getSnapshot()).toEqual({
      phase: "permissionDenied",
      confidence: 0,
    });
    expect(onPermissionDenied).toHaveBeenCalledTimes(1);
  });
});
