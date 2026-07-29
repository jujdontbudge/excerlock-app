import { describe, expect, it } from "vitest";

import {
  CONDITION_CATALOG,
  conditionUniquenessKey,
  conditionsOverlap,
  getPickerVerdict,
  listPickerVerdicts,
  type CatalogId,
  type ConditionSelection,
  type ConditionSource,
  type ExistingCondition,
} from "../index";

function candidate(
  catalogId: CatalogId,
  source: ConditionSource = "appleHealth",
  placeId?: string,
): ConditionSelection {
  return {
    catalogId,
    source,
    ...(placeId === undefined ? {} : { placeId }),
  };
}

function existing(
  id: string,
  selection: ConditionSelection,
): ExistingCondition {
  return { id, ...selection };
}

describe("condition uniqueness and overlap", () => {
  it.each(CONDITION_CATALOG)(
    "marks an exact $id selection as taken",
    (entry) => {
      const source = entry.baseSources[0]!;
      const selection = candidate(
        entry.id as CatalogId,
        source,
        entry.placeRequired ? "gym-one" : undefined,
      );

      expect(
        getPickerVerdict(selection, {
          conditions: [existing("already-created", selection)],
          connectedSources: [
            "strava",
            "oura",
            "whoop",
            "polar",
            "hevy",
            "concept2",
          ],
          savedPlaceIds: ["gym-one"],
        }),
      ).toMatchObject({
        status: "taken",
        coverage: "promoted",
        reason: {
          code: "duplicate",
          message: "Already added for this source and place.",
        },
      });
    },
  );

  it.each([
    ["steps-goal", "steps-rate"],
    ["run-distance-goal", "run-distance-rate"],
    ["cycle-distance-goal", "cycle-distance-rate"],
    ["swim-distance-goal", "swim-distance-rate"],
    ["active-calories-goal", "active-calories-rate"],
    ["active-minutes-goal", "active-minutes-rate"],
  ] as const)(
    "blocks %s against %s in either direction",
    (eventCatalogId, rateCatalogId) => {
      const event = candidate(eventCatalogId);
      const rate = candidate(rateCatalogId);

      expect(conditionsOverlap(event, rate)).toBe("eventRate");
      expect(conditionsOverlap(rate, event)).toBe("eventRate");
      expect(
        getPickerVerdict(event, {
          conditions: [existing("rate", rate)],
          connectedSources: [],
          savedPlaceIds: [],
        }),
      ).toMatchObject({
        status: "blocked",
        reason: {
          code: "event-rate-overlap",
          message:
            "A goal and an exchange cannot use the same signal and source.",
        },
      });
    },
  );

  it("allows state and event conditions for the same gym", () => {
    const arrival = candidate("gym-arrival", "location", "gym-one");
    const presence = candidate("gym-presence", "location", "gym-one");

    expect(conditionsOverlap(arrival, presence)).toBe("none");
    expect(
      getPickerVerdict(presence, {
        conditions: [existing("arrival", arrival)],
        connectedSources: [],
        savedPlaceIds: ["gym-one"],
      }),
    ).toMatchObject({ status: "available" });
  });

  it("keeps source and place inside the uniqueness boundary", () => {
    const appleGoal = candidate("steps-goal", "appleHealth");
    const ouraGoal = candidate("steps-goal", "oura");
    const firstGym = candidate("gym-arrival", "location", "gym-one");
    const secondGym = candidate("gym-arrival", "location", "gym-two");

    expect(conditionUniquenessKey(appleGoal)).toEqual([
      "event",
      "steps",
      "appleHealth",
      null,
    ]);
    expect(conditionsOverlap(appleGoal, ouraGoal)).toBe("none");
    expect(conditionsOverlap(firstGym, secondGym)).toBe("none");
  });
});

describe("picker verdicts", () => {
  const emptyContext = {
    conditions: [],
    connectedSources: [],
    savedPlaceIds: [],
  } as const;

  it("makes Apple Health the promoted default source", () => {
    expect(
      getPickerVerdict(candidate("steps-goal"), emptyContext),
    ).toMatchObject({
      status: "available",
      coverage: "promoted",
      isRecommended: true,
    });
  });

  it("keeps weak vendor coverage selectable but unpromoted", () => {
    expect(
      getPickerVerdict(candidate("run-distance-goal", "oura"), {
        ...emptyContext,
        connectedSources: ["oura"],
      }),
    ).toMatchObject({
      status: "available",
      coverage: "weak",
      isRecommended: false,
    });
  });

  it("hides impossible vendor cells even when the vendor is connected", () => {
    expect(
      getPickerVerdict(candidate("steps-goal", "strava"), {
        ...emptyContext,
        connectedSources: ["strava"],
      }),
    ).toMatchObject({
      status: "hidden",
      coverage: "impossible",
      isRecommended: false,
      reason: {
        code: "source-incompatible",
        message: "This vendor does not expose steps.",
      },
    });
  });

  it("hides compatible sources and source-only entries until connected", () => {
    expect(
      getPickerVerdict(
        candidate("active-minutes-goal", "polar"),
        emptyContext,
      ),
    ).toMatchObject({
      status: "hidden",
      coverage: "promoted",
      reason: {
        code: "source-not-connected",
        message: "Connect Polar to use this condition.",
      },
    });
    expect(
      getPickerVerdict(
        candidate("hevy-strength-workout", "hevy"),
        emptyContext,
      ),
    ).toMatchObject({
      status: "hidden",
      reason: {
        code: "source-not-connected",
        message: "Connect Hevy to use this condition.",
      },
    });
  });

  it("requires a saved place for place-scoped conditions", () => {
    expect(
      getPickerVerdict(
        candidate("gym-arrival", "location"),
        emptyContext,
      ),
    ).toMatchObject({
      status: "hidden",
      reason: {
        code: "place-required",
        message: "Choose a saved gym first.",
      },
    });
  });

  it("lists every catalog entry and source cell as UI-ready verdict data", () => {
    const verdicts = listPickerVerdicts({
      conditions: [],
      connectedSources: ["strava", "oura"],
      savedPlaceIds: ["gym-one", "gym-two"],
    });

    expect(new Set(verdicts.map(({ catalogId }) => catalogId))).toEqual(
      new Set(CONDITION_CATALOG.map(({ id }) => id)),
    );
    expect(
      verdicts.find(
        ({ catalogId, source }) =>
          catalogId === "steps-goal" && source === "strava",
      ),
    ).toMatchObject({ status: "hidden", coverage: "impossible" });
    expect(
      verdicts.find(
        ({ catalogId, source }) =>
          catalogId === "run-distance-goal" && source === "oura",
      ),
    ).toMatchObject({ status: "available", coverage: "weak" });
    expect(
      verdicts.filter(({ catalogId }) => catalogId === "gym-arrival"),
    ).toHaveLength(2);
  });
});
