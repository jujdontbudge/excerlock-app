import {
  NativePhonePlacementProvider,
  type DeviceMotionSample,
  type PhonePlacementModuleClient,
} from "../index";

describe("NativePhonePlacementProvider", () => {
  it("adapts native device-motion events to the placement provider contract", async () => {
    let listener: (sample: DeviceMotionSample) => void = () => {};
    const remove = jest.fn();
    const client: PhonePlacementModuleClient = {
      startDeviceMotion: jest.fn().mockResolvedValue(undefined),
      stopDeviceMotion: jest.fn().mockResolvedValue(undefined),
      addListener: jest.fn((_event, callback) => {
        listener = callback;
        return { remove };
      }),
    };
    const provider = new NativePhonePlacementProvider(client);
    const received: DeviceMotionSample[] = [];
    const unsubscribe = provider.onSample((sample) => received.push(sample));
    const sample: DeviceMotionSample = {
      timestampMs: 1_000,
      gravity: { x: 0, y: -1, z: 0 },
      rotationRate: { x: 0.01, y: 0, z: 0 },
    };

    await provider.start();
    listener(sample);
    await provider.stop();

    expect(received).toEqual([sample]);
    expect(client.startDeviceMotion).toHaveBeenCalledTimes(1);
    expect(client.stopDeviceMotion).toHaveBeenCalledTimes(1);
    unsubscribe();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
