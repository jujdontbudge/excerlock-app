import { createAnalyticsKit } from "./AnalyticsKit";
import { createFlowTracker } from "./flowTracker";

/**
 * The app-wide kit. It holds the no-op transport until the app entry installs
 * a real one (`analytics.installSink(...)`) — the single Phase-5 wiring point,
 * documented in README.md. Screens import this, call `track()`, and never
 * touch a sink.
 */
export const analytics = createAnalyticsKit();

/** The FLOW helpers over that same kit — used only by the rail's renderer. */
export const flowTracker = createFlowTracker(analytics);
