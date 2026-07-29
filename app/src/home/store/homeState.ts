import {
  type ConditionSource,
  type ConfiguredCondition,
  type ConnectedExtraSource,
  type ExistingCondition,
  type PickerContext,
  type TierOneVendorSource,
} from "@excerlock/condition-model";
import {
  emptyJournal,
  UNLIMITED,
  type Journal,
  type LedgerConfig,
} from "@excerlock/ledger";

import type { AllowanceValues } from "../model/allowance";

export interface SavedPlace {
  readonly id: string;
  readonly name: string;
}

export type HomeStoreValues = Readonly<{
  conditions: readonly ConfiguredCondition[];
  /** What Full Lock restores (`null` means there was no chosen limit). */
  allowanceBeforeFullLock: number | null;
  disabledConditionIds: readonly string[];
  journal: Journal;
  ledgerConfig: LedgerConfig;
  connectedSources: readonly (TierOneVendorSource | ConnectedExtraSource)[];
  savedPlaces: readonly SavedPlace[];
}>;

/** Unlimited remains in force until the user chooses an allowance in Manage. */
export const DEFAULT_HOME_STATE: HomeStoreValues = Object.freeze({
  conditions: [],
  allowanceBeforeFullLock: null,
  disabledConditionIds: [],
  journal: emptyJournal(),
  ledgerConfig: Object.freeze({
    dayBoundaryOffsetMinutes: 0,
    baseAllowanceMinutes: UNLIMITED,
    rollover: null,
  }),
  connectedSources: [],
  savedPlaces: [],
});

/** The allowance in the shape its pure transition functions consume. */
export function selectAllowance(
  state: Pick<HomeStoreValues, "ledgerConfig" | "allowanceBeforeFullLock">,
): AllowanceValues {
  return {
    baseAllowanceMinutes: state.ledgerConfig.baseAllowanceMinutes,
    allowanceBeforeFullLock: state.allowanceBeforeFullLock,
  };
}

/** Writes the transition back where the ledger reads it — never a second copy. */
export function applyAllowance(
  state: Pick<HomeStoreValues, "ledgerConfig">,
  next: AllowanceValues,
): Partial<HomeStoreValues> {
  return {
    ledgerConfig: {
      ...state.ledgerConfig,
      baseAllowanceMinutes: next.baseAllowanceMinutes,
    },
    allowanceBeforeFullLock: next.allowanceBeforeFullLock,
  };
}

/** The conditions that are switched on — the only ones Home renders or banks. */
export function selectActiveConditions(
  state: Pick<HomeStoreValues, "conditions" | "disabledConditionIds">,
): readonly ConfiguredCondition[] {
  return state.disabledConditionIds.length === 0
    ? state.conditions
    : state.conditions.filter(({ id }) => !state.disabledConditionIds.includes(id));
}

/** The condition model's picker context, projected from the owned state. */
export function selectPickerContext(
  state: Pick<HomeStoreValues, "conditions" | "connectedSources" | "savedPlaces">,
): PickerContext {
  return {
    conditions: state.conditions.map(toExistingCondition),
    connectedSources: state.connectedSources,
    savedPlaceIds: state.savedPlaces.map(({ id }) => id),
  };
}

function toExistingCondition(condition: ConfiguredCondition): ExistingCondition {
  const { id, catalogId, source, placeId } = condition;
  return placeId === undefined
    ? { id, catalogId, source: source as ConditionSource }
    : { id, catalogId, source: source as ConditionSource, placeId };
}
