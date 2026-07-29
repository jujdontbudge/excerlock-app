import type { ConditionKind } from "./kinds";

export type ActivityGroup =
  | "gym"
  | "walking"
  | "running"
  | "cycling"
  | "swimming"
  | "universal"
  | "connected";

export type Signal =
  | "gymArrival"
  | "gymPresence"
  | "gymMinutes"
  | "walking"
  | "steps"
  | "runDistance"
  | "cycleDistance"
  | "swimDistance"
  | "activeCalories"
  | "activeMinutes"
  | "workoutDuration"
  | "whoopStrain"
  | "strengthWorkout"
  | "rowDistance";

export type NativeSource = "location" | "motion" | "appleHealth";
export type TierOneVendorSource = "strava" | "oura" | "whoop" | "polar";
export type ConnectedExtraSource = "hevy" | "concept2";
export type ConditionSource =
  | NativeSource
  | TierOneVendorSource
  | ConnectedExtraSource;

export type PickerUnit =
  | "step"
  | "kilometer"
  | "mile"
  | "meter"
  | "yard"
  | "kilocalorie"
  | "minute"
  | "strain";

export interface PickerRange {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit: PickerUnit;
}

export interface PickerQuantum {
  readonly value: number;
  readonly unit: PickerUnit;
}

interface EmptyPicker {
  readonly initialValue: null;
}

export interface StateGracePicker extends EmptyPicker {
  readonly type: "stateGrace";
  readonly optionsMs?: readonly number[];
}

export interface ThresholdlessEventPicker extends EmptyPicker {
  readonly type: "thresholdlessEvent";
}

export interface ThresholdPicker extends EmptyPicker {
  readonly type: "threshold";
  readonly range: PickerRange;
  readonly imperialRange?: PickerRange;
}

export interface RatePicker extends EmptyPicker {
  readonly type: "rate";
  readonly quantum: PickerQuantum;
  readonly imperialQuantum?: PickerQuantum;
  readonly minutes: PickerRange;
}

export type CatalogPicker =
  | StateGracePicker
  | ThresholdlessEventPicker
  | ThresholdPicker
  | RatePicker;

export interface ActiveMinutesSignalStrategy {
  readonly strategy: "watchExerciseTimeElseWorkoutDuration";
  readonly watchSignal: "appleExerciseTime";
  readonly fallbackSignal: "recordedWorkoutDuration";
  readonly combination: "exclusive";
}

export interface CatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly activity: ActivityGroup;
  readonly kind: ConditionKind;
  readonly signal: Signal;
  readonly baseSources: readonly ConditionSource[];
  readonly placeRequired: boolean;
  readonly picker: CatalogPicker;
  readonly requiresConnection?: true;
  readonly verification?: "honorSystem" | "machineVerified";
  readonly signalStrategy?: ActiveMinutesSignalStrategy;
}
