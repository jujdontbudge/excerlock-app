import {
  GaitPeriodicityDetector,
  type GaitKeypointSample,
} from "../index";

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

function walkingSamples(
  frequencyHz: number,
  durationMs: number,
  startAtMs = 0,
  sampleIntervalMs = 50,
): GaitKeypointSample[] {
  const samples: GaitKeypointSample[] = [];
  for (
    let elapsedMs = 0;
    elapsedMs <= durationMs;
    elapsedMs += sampleIntervalMs
  ) {
    const phase = (elapsedMs / 1_000) * frequencyHz * Math.PI * 2;
    samples.push(bodySample(startAtMs + elapsedMs, Math.sin(phase) * 0.02));
  }
  return samples;
}

describe("GaitPeriodicityDetector", () => {
  it("recognizes four consecutive strides in the walking band before timeout", () => {
    const detector = new GaitPeriodicityDetector({ startedAtMs: 0 });

    let result = detector.getResult(0);
    for (const sample of walkingSamples(2, 3_000)) {
      result = detector.process(sample);
      if (result.complete) {
        break;
      }
    }

    expect(result).toMatchObject({
      classification: "walking",
      confidence: 1,
      complete: true,
    });
    expect(result.evaluatedAtMs).toBeLessThan(5_000);
  });

  it("accepts slow walking at 1.2 Hz from an every-other-frame pose stream", () => {
    const detector = new GaitPeriodicityDetector({ startedAtMs: 0 });

    let result = detector.getResult(0);
    for (const sample of walkingSamples(1.2, 4_900, 0, 133)) {
      result = detector.process(sample);
      if (result.complete) {
        break;
      }
    }

    expect(result).toMatchObject({
      classification: "walking",
      confidence: 1,
      complete: true,
    });
  });

  it("survives pose jitter injected into a genuine stride sequence", () => {
    // Measured against real Vision output: pose estimation wobbles frame to
    // frame, producing tiny local maxima between true stride peaks. Such a
    // wobble must be discarded, not treated as a stride boundary — otherwise it
    // becomes the reference for the next interval, yields an out-of-band
    // period, and resets an otherwise clean run. Real footage showed 17 of 22
    // detected peaks were jitter of this kind.
    const detector = new GaitPeriodicityDetector({ startedAtMs: 0 });
    const frequencyHz = 2;
    const troughOffset = -0.02;
    const jittered: GaitKeypointSample[] = [];
    for (let elapsedMs = 0; elapsedMs <= 4_000; elapsedMs += 50) {
      const phase = (elapsedMs / 1_000) * frequencyHz * Math.PI * 2;
      jittered.push(bodySample(elapsedMs, Math.sin(phase) * 0.02));
      // A wobble sitting just above every stride trough: a true local maximum,
      // but with a prominence far below a real stride's. Real footage showed 17
      // of 22 detected peaks were jitter like this, so a detector that survives
      // only occasional wobbles is not good enough.
      if ((elapsedMs - 350) % 500 === 0) {
        jittered.push(bodySample(elapsedMs + 10, troughOffset));
        jittered.push(bodySample(elapsedMs + 20, troughOffset + 0.001));
        jittered.push(bodySample(elapsedMs + 30, troughOffset));
      }
    }

    let result = detector.getResult(0);
    for (const sample of jittered) {
      result = detector.process(sample);
      if (result.complete) {
        break;
      }
    }

    expect(result).toMatchObject({ classification: "walking", complete: true });
  });

  it("rejects a person standing still when the five-second scan ends", () => {
    const detector = new GaitPeriodicityDetector({ startedAtMs: 0 });
    for (let timestampMs = 0; timestampMs < 5_000; timestampMs += 100) {
      detector.process(bodySample(timestampMs));
    }

    expect(detector.getResult(5_000)).toEqual({
      classification: "notWalking",
      confidence: 0,
      complete: true,
      evaluatedAtMs: 5_000,
    });
  });

  it("reports insufficient signal when nobody is in frame", () => {
    const detector = new GaitPeriodicityDetector({ startedAtMs: 0 });
    for (let timestampMs = 0; timestampMs < 5_000; timestampMs += 100) {
      detector.process({ timestampMs, landmarks: {} });
    }

    expect(detector.getResult(5_000)).toEqual({
      classification: "insufficientSignal",
      confidence: 0,
      complete: true,
      evaluatedAtMs: 5_000,
    });
  });

  it("does not build stride confidence from landmarks dropping in and out", () => {
    const detector = new GaitPeriodicityDetector({ startedAtMs: 0 });
    const samples = walkingSamples(2, 4_950);
    samples.forEach((sample, index) => {
      detector.process(
        index % 2 === 0
          ? sample
          : {
              ...sample,
              landmarks: { ...sample.landmarks, rightHip: undefined },
            },
      );
    });

    expect(detector.getResult(5_000)).toMatchObject({
      classification: "insufficientSignal",
      confidence: 0,
      complete: true,
    });
  });

  it("reports insufficient signal for low-confidence landmarks", () => {
    const detector = new GaitPeriodicityDetector({ startedAtMs: 0 });
    for (const sample of walkingSamples(2, 4_950)) {
      detector.process({
        ...sample,
        landmarks: Object.fromEntries(
          Object.entries(sample.landmarks).map(([name, landmark]) => [
            name,
            landmark === undefined ? undefined : { ...landmark, confidence: 0.2 },
          ]),
        ),
      });
    }

    expect(detector.getResult(5_000)).toMatchObject({
      classification: "insufficientSignal",
      confidence: 0,
      complete: true,
    });
  });

  it("recognizes a walking person who enters frame during the scan", () => {
    const detector = new GaitPeriodicityDetector({ startedAtMs: 0 });
    for (let timestampMs = 0; timestampMs < 1_000; timestampMs += 100) {
      detector.process({ timestampMs, landmarks: {} });
    }

    let result = detector.getResult(1_000);
    for (const sample of walkingSamples(2, 3_500, 1_000)) {
      result = detector.process(sample);
      if (result.complete) {
        break;
      }
    }

    expect(result).toMatchObject({
      classification: "walking",
      confidence: 1,
      complete: true,
    });
    expect(result.evaluatedAtMs).toBeLessThan(5_000);
  });

  it("rejects oscillation above the 3 Hz walking band", () => {
    const detector = new GaitPeriodicityDetector({ startedAtMs: 0 });
    for (const sample of walkingSamples(3.5, 4_950)) {
      detector.process(sample);
    }

    expect(detector.getResult(5_000)).toMatchObject({
      classification: "notWalking",
      complete: true,
    });
  });

  it("exposes running stride confidence for the scan progress ring", () => {
    const detector = new GaitPeriodicityDetector({ startedAtMs: 0 });
    let result = detector.getResult(0);
    for (const sample of walkingSamples(2, 800)) {
      result = detector.process(sample);
    }

    expect(result).toMatchObject({
      classification: "notWalking",
      confidence: 0.25,
      complete: false,
    });
  });
});
