import type { Signal, TierOneVendorSource } from "./catalog-types";

export const VENDOR_SIGNALS = [
  "steps",
  "runDistance",
  "cycleDistance",
  "swimDistance",
  "activeCalories",
  "activeMinutes",
  "workoutDuration",
  "whoopStrain",
] as const satisfies readonly Signal[];

export type VendorSignal = (typeof VENDOR_SIGNALS)[number];
export type VendorCoverageStatus = "promoted" | "weak" | "impossible";

export type VendorCoverageCell =
  | { readonly status: "promoted" }
  | {
      readonly status: "weak" | "impossible";
      readonly reason: string;
    };

export type VendorCoverageMatrix = Readonly<
  Record<
    TierOneVendorSource,
    Readonly<Record<VendorSignal, VendorCoverageCell>>
  >
>;

const NO_STEPS = {
  status: "impossible",
  reason: "This vendor does not expose steps.",
} as const;
const NOT_WHOOP_STRAIN = {
  status: "impossible",
  reason: "Strain is available only from Whoop.",
} as const;
const OURA_DISTANCE = {
  status: "weak",
  reason: "Workout distance can be missing and is not GPS-backed.",
} as const;
const WHOOP_DISTANCE = {
  status: "weak",
  reason: "Distance is available only for GPS-recorded sports.",
} as const;

export const VENDOR_COVERAGE = {
  strava: {
    steps: NO_STEPS,
    runDistance: { status: "promoted" },
    cycleDistance: { status: "promoted" },
    swimDistance: { status: "promoted" },
    activeCalories: {
      status: "weak",
      reason: "Calories require an additional activity-detail API read.",
    },
    activeMinutes: { status: "promoted" },
    workoutDuration: { status: "promoted" },
    whoopStrain: NOT_WHOOP_STRAIN,
  },
  oura: {
    steps: { status: "promoted" },
    runDistance: OURA_DISTANCE,
    cycleDistance: OURA_DISTANCE,
    swimDistance: OURA_DISTANCE,
    activeCalories: { status: "promoted" },
    activeMinutes: { status: "promoted" },
    workoutDuration: { status: "promoted" },
    whoopStrain: NOT_WHOOP_STRAIN,
  },
  whoop: {
    steps: NO_STEPS,
    runDistance: WHOOP_DISTANCE,
    cycleDistance: WHOOP_DISTANCE,
    swimDistance: WHOOP_DISTANCE,
    activeCalories: { status: "promoted" },
    activeMinutes: { status: "promoted" },
    workoutDuration: { status: "promoted" },
    whoopStrain: { status: "promoted" },
  },
  polar: {
    steps: { status: "promoted" },
    runDistance: { status: "promoted" },
    cycleDistance: { status: "promoted" },
    swimDistance: { status: "promoted" },
    activeCalories: { status: "promoted" },
    activeMinutes: { status: "promoted" },
    workoutDuration: { status: "promoted" },
    whoopStrain: NOT_WHOOP_STRAIN,
  },
} as const satisfies VendorCoverageMatrix;
