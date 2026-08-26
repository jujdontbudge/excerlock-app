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

  it("defines M6 and M7 as five-minute stationary truth tasks with motion on every run", () => {
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
    expect(HARNESS_TEST_DEFINITIONS.every(({ signalSources }) => signalSources.includes("motion"))).toBe(true);
  });
});
