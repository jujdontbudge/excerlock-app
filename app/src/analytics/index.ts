/** AnalyticsKit — the app's only analytics surface. See README.md for the law. */
export { analytics, flowTracker } from "./analytics";
export { createAnalyticsKit } from "./AnalyticsKit";
export type { AnalyticsKit, TrackArgs } from "./AnalyticsKit";
export { createFlowTracker } from "./flowTracker";
export type { FlowTracker } from "./flowTracker";
export { SUPER_PROPERTIES } from "./superProperties";
export { noopSink } from "./noopSink";
export { createRecordingSink } from "./recordingSink";
export type { RecordedEvent, RecordingSink } from "./recordingSink";
export type { AnalyticsPayload, AnalyticsSignal, AnalyticsSink } from "./sink";
export { buildPostHogOptions, FLAG_BUDGET_MS } from "./postHogSink";
