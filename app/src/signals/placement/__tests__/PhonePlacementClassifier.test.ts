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

/** A phone carried in a walking hand: gravity swings with each stride. */
function inHandSample(timestampMs: number): DeviceMotionSample {
  const phase = (timestampMs / 1_000) * Math.PI * 4;
  return sample(
    timestampMs,
    { x: Math.sin(phase) * 0.08, y: -0.8, z: -0.6 },
    { x: 0.2, y: Math.cos(phase) * 0.15, z: 0.1 },
  );
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

  it("detects a hand holding the phone still: the pose still wobbles", () => {
    const classifier = new PhonePlacementClassifier();
    let result = classifier.getResult();
    for (let timestampMs = 0; timestampMs <= 1_000; timestampMs += 100) {
      const direction = timestampMs % 200 === 0 ? 1 : -1;
      result = classifier.process(
        sample(
          timestampMs,
          { x: 0.01 + direction * 0.035, y: -0.7, z: -0.714 },
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

  it("does not commit a transient first placement window before the signal settles", () => {
    const classifier = new PhonePlacementClassifier();
    const placements: string[] = [];
    for (let timestampMs = 0; timestampMs <= 1_000; timestampMs += 100) {
      const direction = timestampMs % 200 === 0 ? 1 : -1;
      placements.push(
        classifier.process(
          sample(
            timestampMs,
            { x: direction * 0.015, y: -0.7, z: -0.714 },
            { x: direction * 0.4, y: direction * 0.2, z: 0.1 },
          ),
        ).placement,
      );
    }
    for (let timestampMs = 1_100; timestampMs <= 2_000; timestampMs += 100) {
      placements.push(
        classifier.process(
          sample(
            timestampMs,
            { x: (timestampMs - 1_000) / 2_000, y: -1, z: 0 },
            { x: 0.18, y: 0.14, z: 0.1 },
          ),
        ).placement,
      );
    }

    expect(placements).not.toContain("propped");
    expect(classifier.getResult().placement).toBe("inHand");
  });

  it("emits a timestamped pickup transition after sustained in-hand evidence", () => {
    const classifier = new PhonePlacementClassifier();
    for (let timestampMs = 0; timestampMs <= 1_000; timestampMs += 100) {
      classifier.process(sample(timestampMs));
    }

    let pickup: PhonePlacementTransition | null = null;
    for (let timestampMs = 1_100; timestampMs <= 4_800; timestampMs += 100) {
      const result = classifier.process(inHandSample(timestampMs));
      pickup ??= result.transition;
    }

    // Three seconds of in-hand evidence: a console rattle never lasts that long.
    expect(pickup).toMatchObject({ kind: "pickedUp" });
    expect(pickup?.timestampMs).toBeGreaterThanOrEqual(4_100);
    expect(pickup?.timestampMs).toBeLessThanOrEqual(4_800);
    expect(classifier.getResult().placement).toBe("inHand");
  });

  it("emits a timestamped set-down transition after sustained propped evidence", () => {
    const classifier = new PhonePlacementClassifier();
    for (let timestampMs = 0; timestampMs <= 1_000; timestampMs += 100) {
      classifier.process(inHandSample(timestampMs));
    }

    let setDown: PhonePlacementTransition | null = null;
    for (let timestampMs = 1_100; timestampMs <= 6_500; timestampMs += 100) {
      const result = classifier.process(sample(timestampMs));
      setDown ??= result.transition;
    }

    // The pooled horizon must drain its in-hand windows (≤3 s) and the
    // set-down debounce must elapse (1.5 s) before a set-down is reported.
    expect(setDown).toMatchObject({ kind: "setDown" });
    expect(setDown?.timestampMs).toBeGreaterThanOrEqual(2_600);
    expect(setDown?.timestampMs).toBeLessThanOrEqual(6_000);
    expect(classifier.getResult().placement).toBe("propped");
  });

  it("does not report a pickup for a short handling-like burst on a vibrating console", () => {
    const classifier = new PhonePlacementClassifier();
    for (let timestampMs = 0; timestampMs <= 1_000; timestampMs += 100) {
      classifier.process(sample(timestampMs));
    }

    const transitions: PhonePlacementTransition[] = [];
    for (let timestampMs = 1_100; timestampMs <= 3_000; timestampMs += 100) {
      const burst = timestampMs <= 1_600;
      const direction = timestampMs % 200 === 0 ? 1 : -1;
      const result = classifier.process(
        burst
          ? sample(
              timestampMs,
              { x: direction * 0.08, y: -0.99, z: 0 },
              { x: direction * 0.2, y: 0.14, z: 0.1 },
            )
          : sample(timestampMs),
      );
      if (result.transition !== null) {
        transitions.push(result.transition);
      }
    }

    expect(transitions).toEqual([]);
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

  it("keeps a high-vibration treadmill phone propped when its overall pose remains stable", () => {
    const classifier = new PhonePlacementClassifier();
    let result = classifier.getResult();
    let timestampMs = 0.41;

    for (let index = 0; index < 30; index += 1) {
      const direction = index % 2 === 0 ? 1 : -1;
      result = classifier.process(
        sample(
          timestampMs,
          { x: direction * 0.015, y: -0.7, z: -0.714 },
          // Measured running-console rotation stays under ~0.35 rad/s.
          { x: direction * 0.3, y: direction * 0.15, z: 0.1 },
        ),
      );
      timestampMs += index % 3 === 0 ? 99.3 : 100.4;
    }

    expect(result.placement).toBe("propped");
    expect(result.transition).toBeNull();
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
