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
  canarySelectionValid: boolean;
  canaryApplicationCount: number;
  canaryCategoryCount: number;
  canaryWebDomainCount: number;
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
  deleteSession(sessionId: string): Promise<void>;
  abandonExpiredSession(sessionId: string): Promise<void>;
};

export const INACTIVE_LINKED_TRACE_STATUS: LinkedTraceStatus = {
  active: false,
  sessionId: null,
  expiresAtWallTimeMs: null,
  truncated: false,
};
