/** AnalyticsKit — the app's only analytics surface. See README.md for the law. */
export { noopSink } from "./noopSink";
export { createRecordingSink } from "./recordingSink";
export type { RecordedEvent, RecordingSink } from "./recordingSink";
export type { AnalyticsPayload, AnalyticsSignal, AnalyticsSink } from "./sink";
