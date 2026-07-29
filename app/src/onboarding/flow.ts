import {
  FLOW_SCREENS,
  type FlowScreen,
} from "@excerlock/analytics-events";

export type FlowEntry = Readonly<{
  screen: FlowScreen;
}>;

/** The app rail inherits both names and order from the analytics contract. */
export const FLOW: readonly FlowEntry[] = FLOW_SCREENS.map((screen) => ({
  screen,
}));
