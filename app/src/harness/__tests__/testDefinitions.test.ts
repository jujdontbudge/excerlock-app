import {
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
});
