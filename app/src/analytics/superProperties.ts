import type { AnalyticsPayload } from "./sink";

/**
 * D2 — the super property stamped onto every mobile event, so ExcerLock's own
 * events stay separable from anything else that ever lands in the project.
 * Registered on whichever sink the kit is holding, including the no-op one.
 */
export const SUPER_PROPERTIES: AnalyticsPayload = { app: "excerlock" };
