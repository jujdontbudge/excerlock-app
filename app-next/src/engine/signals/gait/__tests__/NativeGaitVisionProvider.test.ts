import {
  NativeGaitVisionProvider,
  type GaitKeypointSample,
  type GaitVisionModuleClient,
} from "../index";

describe("NativeGaitVisionProvider", () => {
  it("adapts native body-pose events to the gait vision contract", async () => {
    let listener: (sample: GaitKeypointSample) => void = () => {};
    const remove = jest.fn();
    const client: GaitVisionModuleClient = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      addListener: jest.fn((_event, callback) => {
        listener = callback;
        return { remove };
      }),
    };
    const provider = new NativeGaitVisionProvider(client);
    const received: GaitKeypointSample[] = [];
    const unsubscribe = provider.onSample((sample) => received.push(sample));
    const sample: GaitKeypointSample = {
      timestampMs: 1_000,
      landmarks: {
        leftShoulder: { x: 0.4, y: 0.25, confidence: 0.92 },
        rightShoulder: { x: 0.6, y: 0.25, confidence: 0.91 },
        leftHip: { x: 0.44, y: 0.6, confidence: 0.88 },
        rightHip: { x: 0.56, y: 0.6, confidence: 0.87 },
      },
    };

    await provider.start();
    listener(sample);
    await provider.stop();

    expect(received).toEqual([sample]);
    expect(client.start).toHaveBeenCalledTimes(1);
    expect(client.stop).toHaveBeenCalledTimes(1);
    unsubscribe();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
