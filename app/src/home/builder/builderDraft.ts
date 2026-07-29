import {
  getCatalogEntry,
  type CatalogId,
  type ConditionSource,
  type ConfiguredCondition,
  type EventReward,
  type PickerQuantum,
  type PickerRange,
} from "@excerlock/condition-model";

import type { CatalogOption, SourceOption } from "./builderCatalog";

/**
 * The builder's draft and the moves that change it — pure, so the sheet is a
 * renderer of this state rather than the owner of it.
 *
 * No picker is ever pre-filled (PRD §8, decided 2026-07-28): a draft carries
 * `undefined` until the user chooses, and `canAdvance` refuses to leave the
 * configure step until every control its kind demands has an explicit value.
 */

export type BuilderStep = "catalog" | "source" | "configure" | "preview";

export interface BuilderDraft {
  readonly step: BuilderStep;
  readonly catalogId?: CatalogId;
  readonly source?: ConditionSource;
  readonly placeId?: string;
  /** Whether the source step was offered — `back` has to retrace the same path. */
  readonly hasSourceChoice?: boolean;
  readonly threshold?: number;
  /** Minutes the user assigned to the catalog's fixed quantum. */
  readonly rateMinutes?: number;
  readonly exitGraceMs?: number;
  readonly reward?: EventReward;
}

export const EMPTY_DRAFT: BuilderDraft = Object.freeze({ step: "catalog" });

/** PRD §8: fixed-chunk picker 5–120 min in 5-min steps. */
export const FIXED_CHUNK_RANGE: PickerRange = Object.freeze({
  min: 5,
  max: 120,
  step: 5,
  unit: "minute",
});

/** PRD §8: set-period picker 15 min – 4 h in 15-min steps. */
export const SET_PERIOD_RANGE: PickerRange = Object.freeze({
  min: 15,
  max: 240,
  step: 15,
  unit: "minute",
});

/** PRD §8: the stop-grace wheel — 30 s / 1 / 2 / 3 / 4 / 5 min. */
export const GRACE_OPTIONS_MS: readonly number[] = Object.freeze([
  30_000, 60_000, 120_000, 180_000, 240_000, 300_000,
]);

export type BuilderAction =
  | { readonly type: "pickCatalog"; readonly option: CatalogOption }
  | { readonly type: "pickSource"; readonly option: SourceOption }
  | { readonly type: "setThreshold"; readonly value: number }
  | { readonly type: "setRateMinutes"; readonly value: number }
  | { readonly type: "setGraceMs"; readonly value: number }
  | { readonly type: "setReward"; readonly reward: EventReward }
  | { readonly type: "next" }
  | { readonly type: "back" }
  | { readonly type: "reset" };

export function builderReducer(draft: BuilderDraft, action: BuilderAction): BuilderDraft {
  switch (action.type) {
    case "pickCatalog":
      return pickCatalog(action.option);
    case "pickSource":
      return {
        ...draft,
        step: "configure",
        source: action.option.source,
        ...(action.option.placeId === undefined ? {} : { placeId: action.option.placeId }),
      };
    case "setThreshold":
      return { ...draft, threshold: action.value };
    case "setRateMinutes":
      return { ...draft, rateMinutes: action.value };
    case "setGraceMs":
      return { ...draft, exitGraceMs: action.value };
    case "setReward":
      return { ...draft, reward: action.reward };
    case "next":
      return canAdvance(draft) ? { ...draft, step: nextStep(draft) } : draft;
    case "back":
      return { ...draft, step: previousStep(draft) };
    case "reset":
      return EMPTY_DRAFT;
  }
}

/**
 * The source step only exists when more than one source can provide the signal
 * (PRD §3.3 builder step 2); a single selectable source is chosen for the user.
 */
function pickCatalog(option: CatalogOption): BuilderDraft {
  const selectable = option.sources.filter(({ selectable: free }) => free);
  const only = selectable.length === 1 ? selectable[0] : undefined;

  return {
    step: only === undefined ? "source" : "configure",
    catalogId: option.catalogId,
    hasSourceChoice: only === undefined,
    ...(only === undefined
      ? {}
      : {
          source: only.source,
          ...(only.placeId === undefined ? {} : { placeId: only.placeId }),
        }),
  };
}

export function canAdvance(draft: BuilderDraft): boolean {
  switch (draft.step) {
    case "catalog":
      return draft.catalogId !== undefined && draft.source !== undefined;
    case "source":
      return draft.source !== undefined;
    case "configure":
      return draftCondition(draft, "probe") !== undefined;
    case "preview":
      return true;
  }
}

function nextStep(draft: BuilderDraft): BuilderStep {
  switch (draft.step) {
    case "catalog":
      return draft.hasSourceChoice === true ? "source" : "configure";
    case "source":
      return "configure";
    default:
      return "preview";
  }
}

function previousStep(draft: BuilderDraft): BuilderStep {
  switch (draft.step) {
    case "preview":
      return "configure";
    case "configure":
      return draft.hasSourceChoice === true ? "source" : "catalog";
    default:
      return "catalog";
  }
}

export type ConfigureForm =
  | {
      readonly kind: "event";
      /** Absent on thresholdless events — arriving somewhere has no wheel. */
      readonly threshold?: PickerRange;
      readonly rewardRanges: {
        readonly fixedMinutes: PickerRange;
        readonly setPeriod: PickerRange;
      };
    }
  | {
      readonly kind: "rate";
      readonly quantum: PickerQuantum;
      readonly minutes: PickerRange;
    }
  | { readonly kind: "state"; readonly graceOptionsMs: readonly number[] };

/** Which controls step 3 renders for an entry — read straight off the catalog. */
export function configureForm(catalogId: CatalogId): ConfigureForm {
  const { picker } = getCatalogEntry(catalogId);

  switch (picker.type) {
    case "threshold":
      return {
        kind: "event",
        threshold: picker.range,
        rewardRanges: { fixedMinutes: FIXED_CHUNK_RANGE, setPeriod: SET_PERIOD_RANGE },
      };
    case "thresholdlessEvent":
      return {
        kind: "event",
        rewardRanges: { fixedMinutes: FIXED_CHUNK_RANGE, setPeriod: SET_PERIOD_RANGE },
      };
    case "rate":
      return { kind: "rate", quantum: picker.quantum, minutes: picker.minutes };
    case "stateGrace":
      return { kind: "state", graceOptionsMs: picker.optionsMs ?? GRACE_OPTIONS_MS };
  }
}

/**
 * The condition a complete draft would save — also what the preview step renders,
 * so the card the user approves is the card they get.
 */
export function draftCondition(draft: BuilderDraft, id: string): ConfiguredCondition | undefined {
  if (draft.catalogId === undefined || draft.source === undefined) {
    return undefined;
  }

  const base = {
    id,
    catalogId: draft.catalogId,
    source: draft.source,
    ...(draft.placeId === undefined ? {} : { placeId: draft.placeId }),
  };
  const form = configureForm(draft.catalogId);

  switch (form.kind) {
    case "event": {
      if (draft.reward === undefined || (form.threshold !== undefined && draft.threshold === undefined)) {
        return undefined;
      }
      return {
        ...base,
        settings: {
          kind: "event",
          ...(draft.threshold === undefined ? {} : { threshold: draft.threshold }),
          reward: draft.reward,
          // Repeatability, per-day cap and cooldown are builder step 4's remaining
          // controls (PRD §8 ranges) — Phase 2 saves the decided "off" values.
          repeatable: false,
          perDayCap: null,
          cooldownMs: 0,
        },
      };
    }
    case "rate": {
      if (draft.rateMinutes === undefined) {
        return undefined;
      }
      return {
        ...base,
        settings: {
          kind: "rate",
          reward: {
            type: "proportionalCredit",
            // The wheel sets minutes per quantum; the engine wants minutes per unit.
            minutesPerUnit: draft.rateMinutes / form.quantum.value,
          },
        },
      };
    }
    case "state": {
      if (draft.exitGraceMs === undefined) {
        return undefined;
      }
      return {
        ...base,
        settings: {
          kind: "state",
          reward: { type: "sustainedUnlock" },
          exitGraceMs: draft.exitGraceMs,
        },
      };
    }
  }
}
