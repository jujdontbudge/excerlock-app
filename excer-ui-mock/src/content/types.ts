import type { ImageSourcePropType } from "react-native";

export type SurfaceKind =
  | "brand"
  | "brandedSheet"
  | "focusedChoice"
  | "nightSession"
  | "shieldPreview"
  | "simulatedNative"
  | "localBrowser";

export type ActionCopy = {
  label: string;
  accessibilityLabel?: string;
  disabledReason?: string;
};

export type ScreenCopy = {
  id: string;
  route: string;
  surface: SurfaceKind;
  eyebrow?: string;
  title: string;
  body?: string;
  operationalNote?: string;
  primary?: ActionCopy;
  secondary?: ActionCopy;
  tertiary?: ActionCopy;
  simulatedNativeId?: string;
};

export type ContentOption<T extends string | number | null = string | number | null> = {
  id: string;
  label: string;
  subtitle?: string;
  value: T;
  destructive?: boolean;
};

export type DemoFixture<T> = {
  dataOrigin: "fixture";
  renderedBadge?: "Sample data" | "Prototype preview";
  value: T;
};

export type PermissionStatus = "notAsked" | "allowedInDemo" | "needsAttention";
export type ConditionKind = "event" | "state" | "rate";
export type AccountStatus = "postPurchase" | "signedInDemo" | "signedOutDemo";
export type AccessHolidayKind =
  | "restOfDay"
  | "setPeriod"
  | "restDayNoLocking"
  | "outsideLockWindow";
export type ReviewPromptState =
  | "eligible"
  | "suppressedAfterShield"
  | "shown"
  | "stoppedAfterThree"
  | "stoppedByManualRate";
export type NotificationEntryKind = "afternoonNudge" | "weeklyRecap" | "streakLastCall";
export type HeatCellKind = "event" | "rate" | "state" | "missed" | "rest" | "blank";
export type RuntimeImageSource = ImageSourcePropType;
