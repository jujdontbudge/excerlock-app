import {
  FixtureGaitVisionProvider,
  type GaitKeypointSample,
} from "../index";

const sample: GaitKeypointSample = {
  timestampMs: 250,
  landmarks: {
    leftShoulder: { x: 0.4, y: 0.3, confidence: 0.9 },
    rightShoulder: { x: 0.6, y: 0.3, confidence: 0.9 },
    leftHip: { x: 0.45, y: 0.6, confidence: 0.9 },
    rightHip: { x: 0.55, y: 0.6, confidence: 0.9 },
  },
};

describe("FixtureGaitVisionProvider", () => {
  it("replays keypoint samples only while the scan is running", async () => {
    const provider = new FixtureGaitVisionProvider([sample]);
    const received: GaitKeypointSample[] = [];
    provider.onSample((next) => received.push(next));

    provider.advanceTo(250);
    expect(received).toEqual([]);

    await provider.start();
    provider.advanceTo(250);
    expect(received).toEqual([sample]);

    await provider.stop();
    provider.advanceTo(500);
    expect(received).toEqual([sample]);
  });
});
