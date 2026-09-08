import {
  LEGACY_FLOW_SCREENS,
  type LegacyFlowScreen,
} from "@excerlock/analytics-events";

export type FlowEntry = Readonly<{
  screen: LegacyFlowScreen;
}>;

/** The app rail inherits both names and order from the analytics contract. */
export const FLOW: readonly FlowEntry[] = LEGACY_FLOW_SCREENS.map((screen) => ({
  screen,
}));
