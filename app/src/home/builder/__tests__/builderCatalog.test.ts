import type { PickerContext } from "@excerlock/condition-model";

import { builderCatalog, findOption } from "../builderCatalog";

const EMPTY: PickerContext = { conditions: [], connectedSources: [], savedPlaceIds: [] };

function optionIds(context: PickerContext): readonly string[] {
  return builderCatalog(context).flatMap((group) => group.options.map((option) => option.catalogId));
}

describe("builderCatalog", () => {
  it("groups the catalog by activity in catalog order", () => {
    const groups = builderCatalog(EMPTY);

    expect(groups.map((group) => group.title)).toEqual([
      "Gym",
      "Walking",
      "Running",
      "Cycling",
      "Swimming",
      "Any activity",
    ]);
  });

  it("offers gym entries before a gym is saved, marked as needing one", () => {
    const gymGroup = builderCatalog(EMPTY).find((group) => group.title === "Gym");

    expect(gymGroup?.options.map((option) => option.catalogId)).toEqual([
      "gym-arrival",
      "gym-presence",
      "gym-time-rate",
    ]);
    expect(findOption(builderCatalog(EMPTY), "gym-arrival")).toMatchObject({
      status: "available",
      selectable: true,
      requiresPlace: true,
    });
    expect(findOption(builderCatalog(EMPTY), "gym-arrival")?.reason).toBeUndefined();
    expect(findOption(builderCatalog(EMPTY), "steps-goal")).toMatchObject({
      requiresPlace: false,
    });
  });

  it("still hides an entry the picker hides for any other reason", () => {
    expect(optionIds(EMPTY)).not.toContain("whoop-strain-goal");
  });

  it("offers one source option per saved gym", () => {
    const [gymArrival] = builderCatalog({
      ...EMPTY,
      savedPlaceIds: ["gym-1", "gym-2"],
    })[0]!.options;

    expect(gymArrival?.sources.map((source) => source.placeId)).toEqual(["gym-1", "gym-2"]);
  });

  it("hides connected-app entries until the app is connected", () => {
    expect(optionIds(EMPTY)).not.toContain("whoop-strain-goal");
    expect(optionIds({ ...EMPTY, connectedSources: ["whoop"] })).toContain("whoop-strain-goal");
  });

  it("hides vendor sources a vendor cannot provide", () => {
    const stepsGoal = findOption(builderCatalog({ ...EMPTY, connectedSources: ["strava", "oura"] }), "steps-goal");

    // Strava exposes no steps at all; Oura does.
    expect(stepsGoal?.sources.map((source) => source.source)).toEqual(["appleHealth", "oura"]);
  });

  it("marks weak vendor coverage as selectable but never recommended", () => {
    const runGoal = findOption(builderCatalog({ ...EMPTY, connectedSources: ["oura"] }), "run-distance-goal");
    const oura = runGoal?.sources.find((source) => source.source === "oura");

    expect(oura).toMatchObject({
      coverage: "weak",
      isRecommended: false,
      note: "Workout distance can be missing and is not GPS-backed.",
    });
  });

  it("puts the default source first and promoted vendors ahead of weak ones", () => {
    const runGoal = findOption(
      builderCatalog({ ...EMPTY, connectedSources: ["oura", "strava"] }),
      "run-distance-goal",
    );

    expect(runGoal?.sources.map((source) => source.source)).toEqual([
      "appleHealth",
      "strava",
      "oura",
    ]);
  });

  it("greys an entry the user already has, with the picker's reason", () => {
    const taken = findOption(
      builderCatalog({
        ...EMPTY,
        conditions: [{ id: "c1", catalogId: "steps-goal", source: "appleHealth" }],
      }),
      "steps-goal",
    );

    expect(taken).toMatchObject({
      status: "taken",
      reason: "Already added for this source and place.",
      selectable: false,
    });
  });

  it("greys the event×rate counterpart it blocks, with the picker's reason", () => {
    const blocked = findOption(
      builderCatalog({
        ...EMPTY,
        conditions: [{ id: "c1", catalogId: "steps-goal", source: "appleHealth" }],
      }),
      "steps-rate",
    );

    expect(blocked).toMatchObject({
      status: "blocked",
      reason: "A goal and an exchange cannot use the same signal and source.",
      selectable: false,
    });
  });

  it("keeps an entry selectable while any of its sources is free", () => {
    const stepsGoal = findOption(
      builderCatalog({
        ...EMPTY,
        connectedSources: ["oura"],
        conditions: [{ id: "c1", catalogId: "steps-goal", source: "appleHealth" }],
      }),
      "steps-goal",
    );

    expect(stepsGoal).toMatchObject({ status: "available", selectable: true });
    expect(stepsGoal?.sources.map((source) => source.status)).toEqual(["taken", "available"]);
  });

  it("leaves states and events on the same signal free of each other", () => {
    const walking = findOption(
      builderCatalog({
        ...EMPTY,
        conditions: [{ id: "c1", catalogId: "steps-goal", source: "appleHealth" }],
      }),
      "walking-state",
    );

    expect(walking).toMatchObject({ status: "available" });
  });
});
