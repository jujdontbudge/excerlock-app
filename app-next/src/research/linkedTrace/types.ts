export type LinkedTraceEventType =
  | 'app_lifecycle'
  | 'execution_opportunity'
  | 'motion_input_js'
  | 'motion_evidence'
  | 'detector_persist'
  | 'policy_publish'
  | 'watchdog_operation'
  | 'shield_write';

export type LinkedTraceStatus = {
  active: boolean;
  sessionId: string | null;
  expiresAtWallTimeMs: number | null;
  truncated: boolean;
};

export type LinkedTracePreflight = {
  labStorageIsolated: boolean;
  screenTimeAuthorized: boolean;
  motionReady: boolean;
  /**
   * iOS never reveals which apps a FamilyActivitySelection holds, so this only
   * proves the shape: exactly one application, no categories, no web domains.
   * The one-path UI tells the operator to pick one harmless canary and never a
   * research app, because no native check can prove that choice.
   */
  canarySelectionValid: boolean;
  canaryApplicationCount: number;
  canaryCategoryCount: number;
  canaryWebDomainCount: number;
};

export type LinkedTraceFinalizedSession = {
  sessionId: string;
  byteCount: number;
  finalizedAtWallTimeMs: number;
};

export type LinkedTraceScalar = string | number | boolean | null | string[];
export type LinkedTracePayload = Readonly<Record<string, LinkedTraceScalar | undefined>>;

export type LinkedTraceClient = {
  readonly enabled: boolean;
  start(sessionId: string, nonce: string): Promise<LinkedTraceStatus>;
  status(): Promise<LinkedTraceStatus>;
  preflight(): Promise<LinkedTracePreflight>;
  record(eventType: LinkedTraceEventType, payload: LinkedTracePayload, operationId?: string): void;
  stop(sessionId: string, nonce: string): Promise<string>;
  /** Finalized local traces that can still be shared, newest first. */
  finalized(): Promise<LinkedTraceFinalizedSession[]>;
  /** Rebuilds the shareable copy from the durable App Group trace. */
  exportSession(sessionId: string): Promise<string>;
  deleteSession(sessionId: string): Promise<void>;
  abandonExpiredSession(sessionId: string): Promise<void>;
  /**
   * Stops an active test whose recorder never started or cannot finish. Writes
   * a durable abandonment record instead of a finalized one, so the unfinished
   * trace can never be listed or exported.
   */
  cancelActiveSession(sessionId: string): Promise<void>;
};

export const INACTIVE_LINKED_TRACE_STATUS: LinkedTraceStatus = {
  active: false,
  sessionId: null,
  expiresAtWallTimeMs: null,
  truncated: false,
};
