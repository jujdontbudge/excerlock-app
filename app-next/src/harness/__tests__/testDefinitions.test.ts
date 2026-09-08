import {
  HARNESS_TEST_DEFINITIONS,
  assertValidTestDefinitions,
  type HarnessTestDefinition,
} from "../testDefinitions";

const valid: HarnessTestDefinition = {
  id: "marker-only",
  title: "Marker-only harness check",
  kind: "declare-truth",
  countdownMs: 3_000,
  defaultDurationMs: 10_000,
  markerLabels: ["Started", "Stopped"],
  signalSources: [],
};

describe("test definition validation", () => {
  it("accepts unique definitions with labelled markers and positive durations", () => {
    expect(() => assertValidTestDefinitions([valid])).not.toThrow();
  });

  it.each([
    [[valid, valid], "duplicate test identifier"],
    [[{ ...valid, markerLabels: [""] }], "labelled marker"],
    [[{ ...valid, defaultDurationMs: 0 }], "positive duration"],
    [[{ ...valid, parameters: [{ id: "", label: "Speed" }] }], "parameter identifier"],
  ] satisfies ReadonlyArray<readonly [readonly HarnessTestDefinition[], string]>) (
    "rejects an invalid catalog: %s",
    (definitions, message) => {
      expect(() => assertValidTestDefinitions(definitions)).toThrow(message);
    },
  );

  it("defines M6 and M7 as five-minute stationary truth tasks", () => {
    expect(HARNESS_TEST_DEFINITIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "M6",
          defaultDurationMs: 300_000,
          markerLabels: expect.arrayContaining(["I am stationary"]),
          signalSources: expect.arrayContaining(["motion"]),
        }),
        expect.objectContaining({
          id: "M7",
          defaultDurationMs: 300_000,
          markerLabels: expect.arrayContaining(["I am stationary"]),
          signalSources: expect.arrayContaining(["motion"]),
        }),
      ]),
    );
  });

  it("declares the C1/C2 hands-free discrimination pair as camera-only tasks", () => {
    expect(
      HARNESS_TEST_DEFINITIONS.filter((definition) =>
        definition.id.startsWith("c"),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "c1-treadmill-walking",
          countdownMs: expect.any(Number),
          handsFreePlan: expect.any(String),
          panel: "camera-preview",
          signalSources: ["camera"],
        }),
        expect.objectContaining({
          id: "c2-empty-running-belt",
          countdownMs: expect.any(Number),
          handsFreePlan: expect.any(String),
          panel: "camera-preview",
          signalSources: ["camera"],
        }),
      ]),
    );
  });

  it("defines P3 in the tester's own terms without an on-device verdict", () => {
    expect(HARNESS_TEST_DEFINITIONS).toContainEqual({
      id: "P3",
      title: "Placement sensor only: phone propped on a running belt",
      kind: "declare-truth",
      countdownMs: 10_000,
      defaultDurationMs: 120_000,
      markerLabels: ["The phone is propped", "The belt is running"],
      signalSources: ["placement"],
      handsFreePlan: expect.stringContaining("No camera"),
    });
  });

  it("defines T1 as the whole propped flow: motion, placement, and camera together", () => {
    expect(HARNESS_TEST_DEFINITIONS).toContainEqual(
      expect.objectContaining({
        id: "t1-propped-flow",
        signalSources: ["motion", "placement", "camera"],
        panel: "camera-preview",
        markerLabels: [
          "I propped the phone",
          "I see myself walking in the preview",
          "I picked the phone up",
          "I set it down again",
        ],
      }),
    );
  });

  it("defines M2/M4 walking baselines and a structured treadmill speed for M4", () => {
    expect(HARNESS_TEST_DEFINITIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "M2", parameters: [] }),
        expect.objectContaining({
          id: "M4",
          parameters: [
            {
              id: "treadmillSpeedMph",
              label: "Treadmill speed",
              unit: "mph",
            },
          ],
        }),
      ]),
    );
  });
});
