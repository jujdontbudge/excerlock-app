import { PhonePlacementClassifier } from "../PhonePlacementClassifier";
import recordings from "./fixtures/treadmillRecordings.json";

/**
 * Real treadmill recordings (#128). These pin the two failures seen on device:
 * walking with the phone in hand read "propped" for a third of the run, and a
 * phone propped on a running belt read "in hand" within ten seconds.
 */
function replay(samples: typeof recordings.inHandWalking) {
  const classifier = new PhonePlacementClassifier();
  const counts = { unknown: 0, inHand: 0, propped: 0 };
  const transitions: string[] = [];
  for (const sample of samples) {
    const result = classifier.process(sample);
    counts[result.placement] += 1;
    if (result.transition) transitions.push(result.transition.kind);
  }
  return { counts, transitions };
}

describe("PhonePlacementClassifier on treadmill recordings", () => {
  it("never calls a phone carried in a walking hand propped", () => {
    const { counts, transitions } = replay(recordings.inHandWalking);
    expect(counts.propped).toBe(0);
    expect(transitions).toEqual([]);
    expect(counts.inHand).toBeGreaterThan(400);
  });

  it("keeps a phone propped on a running belt propped despite jolts", () => {
    const { counts, transitions } = replay(recordings.proppedOnRunningBelt);
    expect(counts.inHand).toBe(0);
    expect(transitions).toEqual([]);
    expect(counts.propped).toBeGreaterThan(40);
  });

  it("keeps a phone propped on a quiet console propped", () => {
    const { counts, transitions } = replay(recordings.proppedOnQuietConsole);
    expect(counts.inHand).toBe(0);
    expect(transitions).toEqual([]);
  });
});
