import {
  FixturePhonePlacementProvider,
  type DeviceMotionSample,
} from "../index";

const sample: DeviceMotionSample = {
  timestampMs: 100,
  gravity: { x: 0, y: -1, z: 0 },
  rotationRate: { x: 0.01, y: 0, z: -0.01 },
};

describe("FixturePhonePlacementProvider", () => {
  it("replays device-motion samples only while observation is running", async () => {
    const provider = new FixturePhonePlacementProvider([sample]);
    const received: DeviceMotionSample[] = [];
    provider.onSample((next) => received.push(next));

    provider.advanceTo(100);
    expect(received).toEqual([]);

    await provider.start();
    provider.advanceTo(100);
    expect(received).toEqual([sample]);

    await provider.stop();
    provider.advanceTo(200);
    expect(received).toEqual([sample]);
  });
});
