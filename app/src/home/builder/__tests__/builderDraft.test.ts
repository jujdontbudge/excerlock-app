import type { PickerContext } from "@excerlock/condition-model";

import { builderCatalog, findOption } from "../builderCatalog";
import {
  builderReducer,
  canAdvance,
  configureForm,
  draftCondition,
  EMPTY_DRAFT,
  FIXED_CHUNK_RANGE,
  SET_PERIOD_RANGE,
} from "../builderDraft";

const EMPTY: PickerContext = { conditions: [], connectedSources: [], savedPlaceIds: [] };

function option(catalogId: string, context: PickerContext = EMPTY) {
  const found = findOption(builderCatalog(context), catalogId);
  if (found === undefined) {
    throw new Error(`No builder option for ${catalogId}`);
  }
  return found;
}

describe("builderReducer", () => {
  it("starts on the catalog step with nothing chosen", () => {
    expect(EMPTY_DRAFT).toEqual({ step: "catalog" });
    expect(canAdvance(EMPTY_DRAFT)).toBe(false);
  });

  it("skips the source step when only one source can provide the signal", () => {
    const draft = builderReducer(EMPTY_DRAFT, {
      type: "pickCatalog",
      option: option("steps-goal"),
    });

    expect(draft).toMatchObject({
      step: "configure",
      catalogId: "steps-goal",
      source: "appleHealth",
      hasSourceChoice: false,
    });
  });

  it("asks for a source when more than one can provide the signal", () => {
    const context: PickerContext = { ...EMPTY, connectedSources: ["strava"] };
    const draft = builderReducer(EMPTY_DRAFT, {
      type: "pickCatalog",
      option: option("run-distance-goal", context),
    });

    expect(draft).toMatchObject({ step: "source", hasSourceChoice: true });
    expect(draft.source).toBeUndefined();
  });

  it("moves to configure once a source is chosen", () => {
    const context: PickerContext = { ...EMPTY, connectedSources: ["strava"] };
    const picked = option("run-distance-goal", context);
    const draft = builderReducer(
      builderReducer(EMPTY_DRAFT, { type: "pickCatalog", option: picked }),
      { type: "pickSource", option: picked.sources[1]! },
    );

    expect(draft).toMatchObject({ step: "configure", source: "strava" });
  });

  it("carries the saved gym through as the condition's place", () => {
    const context: PickerContext = { ...EMPTY, savedPlaceIds: ["gym-1"] };
    const draft = builderReducer(EMPTY_DRAFT, {
      type: "pickCatalog",
      option: option("gym-presence", context),
    });

    expect(draft).toMatchObject({ source: "location", placeId: "gym-1" });
  });

  it("walks back to the catalog when there was no source step", () => {
    const draft = builderReducer(EMPTY_DRAFT, { type: "pickCatalog", option: option("steps-goal") });

    expect(builderReducer(draft, { type: "back" }).step).toBe("catalog");
  });

  it("walks back through the source step when there was one", () => {
    const context: PickerContext = { ...EMPTY, connectedSources: ["strava"] };
    const picked = option("run-distance-goal", context);
    const configuring = builderReducer(
      builderReducer(EMPTY_DRAFT, { type: "pickCatalog", option: picked }),
      { type: "pickSource", option: picked.sources[0]! },
    );

    expect(builderReducer(configuring, { type: "back" }).step).toBe("source");
  });

  it("refuses to advance past configure until every picker is filled", () => {
    let draft = builderReducer(EMPTY_DRAFT, { type: "pickCatalog", option: option("steps-goal") });
    expect(canAdvance(draft)).toBe(false);

    draft = builderReducer(draft, { type: "setThreshold", value: 10_000 });
    expect(canAdvance(draft)).toBe(false);

    draft = builderReducer(draft, { type: "setReward", reward: { type: "fixedMinutes", minutes: 30 } });
    expect(canAdvance(draft)).toBe(true);
    expect(builderReducer(draft, { type: "next" }).step).toBe("preview");
  });

  it("keeps a thresholdless event waiting only on its reward", () => {
    const context: PickerContext = { ...EMPTY, savedPlaceIds: ["gym-1"] };
    let draft = builderReducer(EMPTY_DRAFT, {
      type: "pickCatalog",
      option: option("gym-arrival", context),
    });
    expect(canAdvance(draft)).toBe(false);

    draft = builderReducer(draft, { type: "setReward", reward: { type: "restOfDay" } });
    expect(canAdvance(draft)).toBe(true);
  });

  it("resets back to an empty draft", () => {
    const draft = builderReducer(EMPTY_DRAFT, { type: "pickCatalog", option: option("steps-goal") });

    expect(builderReducer(draft, { type: "reset" })).toEqual(EMPTY_DRAFT);
  });
});

describe("configureForm", () => {
  it("describes an event's threshold wheel and its reward step", () => {
    expect(configureForm("steps-goal")).toEqual({
      kind: "event",
      threshold: { min: 1_000, max: 30_000, step: 500, unit: "step" },
      rewardRanges: { fixedMinutes: FIXED_CHUNK_RANGE, setPeriod: SET_PERIOD_RANGE },
    });
  });

  it("describes a rate's fixed quantum and its one minutes wheel", () => {
    expect(configureForm("steps-rate")).toEqual({
      kind: "rate",
      quantum: { value: 1_000, unit: "step" },
      minutes: { min: 5, max: 60, step: 5, unit: "minute" },
    });
  });

  it("describes a state's grace wheel from the catalog", () => {
    expect(configureForm("walking-state")).toEqual({
      kind: "state",
      graceOptionsMs: [30_000, 60_000, 120_000, 180_000, 240_000, 300_000],
    });
  });

  it("falls back to the decided grace wheel when the entry ships no options", () => {
    expect(configureForm("gym-presence")).toEqual({
      kind: "state",
      graceOptionsMs: [30_000, 60_000, 120_000, 180_000, 240_000, 300_000],
    });
  });
});

describe("draftCondition", () => {
  it("is undefined while the draft is incomplete", () => {
    expect(draftCondition(EMPTY_DRAFT, "new-1")).toBeUndefined();
  });

  it("builds an event condition with the decided defaults for the reward details", () => {
    let draft = builderReducer(EMPTY_DRAFT, { type: "pickCatalog", option: option("steps-goal") });
    draft = builderReducer(draft, { type: "setThreshold", value: 10_000 });
    draft = builderReducer(draft, { type: "setReward", reward: { type: "fixedMinutes", minutes: 30 } });

    expect(draftCondition(draft, "new-1")).toEqual({
      id: "new-1",
      catalogId: "steps-goal",
      source: "appleHealth",
      settings: {
        kind: "event",
        threshold: 10_000,
        reward: { type: "fixedMinutes", minutes: 30 },
        repeatable: false,
        perDayCap: null,
        cooldownMs: 0,
      },
    });
  });

  it("turns the minutes wheel into the engine's pure per-unit ratio", () => {
    let draft = builderReducer(EMPTY_DRAFT, { type: "pickCatalog", option: option("steps-rate") });
    draft = builderReducer(draft, { type: "setRateMinutes", value: 20 });

    expect(draftCondition(draft, "new-2")).toEqual({
      id: "new-2",
      catalogId: "steps-rate",
      source: "appleHealth",
      settings: { kind: "rate", reward: { type: "proportionalCredit", minutesPerUnit: 0.02 } },
    });
  });

  it("builds a state condition with its grace and its place", () => {
    const context: PickerContext = { ...EMPTY, savedPlaceIds: ["gym-1"] };
    let draft = builderReducer(EMPTY_DRAFT, {
      type: "pickCatalog",
      option: option("gym-presence", context),
    });
    draft = builderReducer(draft, { type: "setGraceMs", value: 120_000 });

    expect(draftCondition(draft, "new-3")).toEqual({
      id: "new-3",
      catalogId: "gym-presence",
      source: "location",
      placeId: "gym-1",
      settings: {
        kind: "state",
        reward: { type: "sustainedUnlock" },
        exitGraceMs: 120_000,
      },
    });
  });
});
