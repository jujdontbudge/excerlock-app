import {
  PhonePlacementClassifier,
  type DeviceMotionSample,
  type MotionVector3,
  type PhonePlacementTransition,
} from "../index";

function sample(
  timestampMs: number,
  gravity: MotionVector3 = { x: 0, y: 0, z: -1 },
  rotationRate: MotionVector3 = { x: 0.005, y: -0.004, z: 0.003 },
): DeviceMotionSample {
  return { timestampMs, gravity, rotationRate };
}

describe("PhonePlacementClassifier", () => {
  it("classifies a phone resting flat as propped after one second", () => {
    const classifier = new PhonePlacementClassifier();
    let result = classifier.getResult();
    for (let timestampMs = 0; timestampMs <= 1_000; timestampMs += 100) {
      result = classifier.process(sample(timestampMs));
    }

    expect(result).toEqual({
      placement: "propped",
      transition: null,
      evaluatedAtMs: 1_000,
    });
  });

  it("classifies an irregular 10 Hz stream without requiring a sample exactly on the window boundary", () => {
    const classifier = new PhonePlacementClassifier();
    let result = classifier.getResult();
    const intervalsMs = [99.4, 101.3, 98.8, 100.7, 99.9, 101.1, 99.2, 100.6, 99.7, 101.5];
    let timestampMs = 0.37;

    result = classifier.process(sample(timestampMs));
    for (const intervalMs of intervalsMs) {
      timestampMs += intervalMs;
      result = classifier.process(sample(timestampMs));
    }

    expect(timestampMs).toBeGreaterThan(1_000);
    expect(result.placement).toBe("propped");
  });

  it("classifies a phone resting at a treadmill-console angle as propped", () => {
    const classifier = new PhonePlacementClassifier();
    let result = classifier.getResult();
    for (let timestampMs = 0; timestampMs <= 1_000; timestampMs += 100) {
      result = classifier.process(
        sample(timestampMs, { x: 0, y: -0.7, z: -0.714 }),
      );
    }

    expect(result.placement).toBe("propped");
  });

  it("detects hand micro-tremor even when the phone is held still", () => {
    const classifier = new PhonePlacementClassifier();
    let result = classifier.getResult();
    for (let timestampMs = 0; timestampMs <= 1_000; timestampMs += 100) {
      const direction = timestampMs % 200 === 0 ? 1 : -1;
      result = classifier.process(
        sample(
          timestampMs,
          { x: 0.01, y: -0.7, z: -0.714 },
          { x: direction * 0.16, y: direction * 0.1, z: 0.08 },
        ),
      );
    }

    expect(result.placement).toBe("inHand");
  });

  it("classifies a phone held while walking as in hand", () => {
    const classifier = new PhonePlacementClassifier();
    let result = classifier.getResult();
    for (let timestampMs = 0; timestampMs <= 1_000; timestampMs += 100) {
      const phase = (timestampMs / 1_000) * Math.PI * 4;
      result = classifier.process(
        sample(
          timestampMs,
          { x: Math.sin(phase) * 0.08, y: -0.8, z: -0.6 },
          { x: 0.2, y: Math.cos(phase) * 0.15, z: 0.1 },
        ),
      );
    }

    expect(result.placement).toBe("inHand");
  });

  it("emits a timestamped pickup transition after sustained in-hand evidence", () => {
    const classifier = new PhonePlacementClassifier();
    for (let timestampMs = 0; timestampMs <= 1_000; timestampMs += 100) {
      classifier.process(sample(timestampMs));
    }

    let pickup: PhonePlacementTransition | null = null;
    for (let timestampMs = 1_100; timestampMs <= 2_200; timestampMs += 100) {
      const result = classifier.process(
        sample(timestampMs, { x: (timestampMs - 1_000) / 5_000, y: -1, z: 0 }, {
          x: 0.18,
          y: 0.14,
          z: 0.1,
        }),
      );
      pickup ??= result.transition;
    }

    expect(pickup).toMatchObject({ kind: "pickedUp" });
    expect(pickup?.timestampMs).toBeGreaterThanOrEqual(1_800);
    expect(pickup?.timestampMs).toBeLessThanOrEqual(2_100);
    expect(classifier.getResult().placement).toBe("inHand");
  });

  it("emits a timestamped set-down transition after sustained propped evidence", () => {
    const classifier = new PhonePlacementClassifier();
    for (let timestampMs = 0; timestampMs <= 1_000; timestampMs += 100) {
      classifier.process(
        sample(timestampMs, { x: timestampMs / 5_000, y: -1, z: 0 }, {
          x: 0.18,
          y: 0.14,
          z: 0.1,
        }),
      );
    }

    let setDown: PhonePlacementTransition | null = null;
    for (let timestampMs = 1_100; timestampMs <= 2_300; timestampMs += 100) {
      const result = classifier.process(sample(timestampMs));
      setDown ??= result.transition;
    }

    expect(setDown).toMatchObject({ kind: "setDown" });
    expect(setDown?.timestampMs).toBeGreaterThanOrEqual(1_900);
    expect(setDown?.timestampMs).toBeLessThanOrEqual(2_200);
    expect(classifier.getResult().placement).toBe("propped");
  });

  it("debounces a single bump without reporting a pickup", () => {
    const classifier = new PhonePlacementClassifier();
    for (let timestampMs = 0; timestampMs <= 1_000; timestampMs += 100) {
      classifier.process(sample(timestampMs));
    }

    const transitions: PhonePlacementTransition[] = [];
    for (let timestampMs = 1_100; timestampMs <= 2_500; timestampMs += 100) {
      const result = classifier.process(
        timestampMs === 1_500
          ? sample(timestampMs, { x: 0.08, y: -0.99, z: 0 }, { x: 0.5, y: 0.2, z: 0.1 })
          : sample(timestampMs),
      );
      if (result.transition !== null) {
        transitions.push(result.transition);
      }
    }

    expect(transitions).toEqual([]);
    expect(classifier.getResult().placement).toBe("propped");
  });

  it("keeps a treadmill-vibrating phone classified as propped", () => {
    const classifier = new PhonePlacementClassifier();
    let result = classifier.getResult();
    for (let timestampMs = 0; timestampMs <= 2_000; timestampMs += 100) {
      const direction = timestampMs % 200 === 0 ? 1 : -1;
      result = classifier.process(
        sample(
          timestampMs,
          { x: direction * 0.002, y: -0.7, z: -0.714 },
          { x: direction * 0.04, y: direction * 0.025, z: 0.015 },
        ),
      );
    }

    expect(result.placement).toBe("propped");
    expect(result.transition).toBeNull();
  });
});
