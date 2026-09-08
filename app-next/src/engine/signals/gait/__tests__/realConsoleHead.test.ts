import { GaitPeriodicityDetector, GAIT_SCAN_TIMEOUT_MS } from "../index";
import frames from "../fixtures/real-console-head.json";

/**
 * Face boxes extracted (Apple Vision, 15 fps) from a real recording of a
 * walker with the phone propped on a treadmill console (#132, 2026-09-05).
 * No body landmarks were usable in that recording; the head alone must carry
 * the verdict.
 */
describe("GaitPeriodicityDetector on a real console recording", () => {
  it("reads walking from head bob in every five-second scan window", () => {
    const verdicts: string[] = [];
    for (let startMs = 0; startMs + GAIT_SCAN_TIMEOUT_MS <= 11_000; startMs += 2_000) {
      const detector = new GaitPeriodicityDetector({ startedAtMs: startMs });
      let last = detector.getResult(startMs);
      for (const frame of frames) {
        if (frame.timestampMs < startMs) continue;
        last = detector.process({ ...frame, landmarks: {} });
        if (last.complete) break;
      }
      verdicts.push(last.classification);
    }
    expect(verdicts).toEqual(verdicts.map(() => "walking"));
  });
});
