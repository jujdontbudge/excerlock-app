/** AnalyticsKit — the app's only analytics surface. See README.md for the law. */
export { createAnalyticsKit } from "./AnalyticsKit";
export type { AnalyticsKit, TrackArgs } from "./AnalyticsKit";
export { SUPER_PROPERTIES } from "./superProperties";
export { noopSink } from "./noopSink";
export { createRecordingSink } from "./recordingSink";
export type { RecordedEvent, RecordingSink } from "./recordingSink";
export type { AnalyticsPayload, AnalyticsSignal, AnalyticsSink } from "./sink";
