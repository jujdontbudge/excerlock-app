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

  it("defines P3 in the tester's own terms without an on-device verdict", () => {
    expect(HARNESS_TEST_DEFINITIONS).toContainEqual({
      id: "P3",
      title: "Phone propped on a running treadmill",
      kind: "declare-truth",
      countdownMs: 10_000,
      defaultDurationMs: 120_000,
      markerLabels: ["The phone is propped", "The belt is running"],
      signalSources: ["placement"],
    });
  });
});
