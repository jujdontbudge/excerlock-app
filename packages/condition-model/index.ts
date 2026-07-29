export { CONDITION_KINDS } from "./kinds";
export type { ConditionKind, RewardFamily } from "./kinds";
export {
  ACTIVE_MINUTES_SIGNAL,
  CONDITION_CATALOG,
  EMPTY_START_CONDITIONS,
  STREAK_FLOORS,
} from "./catalog";
export type { CatalogId } from "./catalog";
export type {
  ActiveMinutesSignalStrategy,
  ActivityGroup,
  CatalogEntry,
  CatalogPicker,
  ConditionSource,
  ConnectedExtraSource,
  NativeSource,
  PickerQuantum,
  PickerRange,
  PickerUnit,
  RatePicker,
  Signal,
  StateGracePicker,
  ThresholdPicker,
  ThresholdlessEventPicker,
  TierOneVendorSource,
} from "./catalog-types";
export { VENDOR_COVERAGE, VENDOR_SIGNALS } from "./coverage";
export type {
  VendorCoverageCell,
  VendorCoverageMatrix,
  VendorCoverageStatus,
  VendorSignal,
} from "./coverage";
export {
  conditionUniquenessKey,
  conditionsOverlap,
  getCatalogEntry,
  getPickerVerdict,
  listPickerVerdicts,
} from "./picker";
export type {
  ConditionOverlap,
  ConditionSelection,
  ExistingCondition,
  PickerContext,
  PickerCoverage,
  PickerReason,
  PickerReasonCode,
  PickerStatus,
  PickerVerdict,
} from "./picker";
export { EVALUATION_TIMELINES } from "./fixtures/evaluation-timelines";
