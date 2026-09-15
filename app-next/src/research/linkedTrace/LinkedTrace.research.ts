import { requireNativeModule } from 'expo-modules-core';

import type {
  LinkedTraceClient,
  LinkedTraceEventType,
  LinkedTraceFinalizedSession,
  LinkedTracePayload,
  LinkedTracePreflight,
  LinkedTraceStatus,
} from './types';

type NativeLinkedTraceModule = {
  startLinkedTrace(sessionId: string, nonce: string): LinkedTraceStatus;
  linkedTraceStatus(): LinkedTraceStatus;
  linkedTracePreflight(): LinkedTracePreflight;
  recordLinkedTrace(eventType: LinkedTraceEventType, operationId: string | null, payload: Record<string, unknown>): boolean;
  stopLinkedTrace(sessionId: string, nonce: string): string;
  linkedTraceFinalizedSessions(): LinkedTraceFinalizedSession[];
  exportLinkedTrace(sessionId: string): string;
  deleteLinkedTrace(sessionId: string): void;
  abandonExpiredLinkedTrace(sessionId: string): void;
};

const native = requireNativeModule<NativeLinkedTraceModule>('ExcerlockEnforcement');

function compact(payload: LinkedTracePayload): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter((entry) => entry[1] !== undefined));
}

export const linkedTrace: LinkedTraceClient = {
  enabled: true,
  async start(sessionId, nonce) { return native.startLinkedTrace(sessionId, nonce); },
  async status() { return native.linkedTraceStatus(); },
  async preflight() { return native.linkedTracePreflight(); },
  record(eventType, payload, operationId) {
    native.recordLinkedTrace(eventType, operationId ?? null, compact(payload));
  },
  async stop(sessionId, nonce) { return native.stopLinkedTrace(sessionId, nonce); },
  async finalized() { return native.linkedTraceFinalizedSessions(); },
  async exportSession(sessionId) { return native.exportLinkedTrace(sessionId); },
  async deleteSession(sessionId) { native.deleteLinkedTrace(sessionId); },
  async abandonExpiredSession(sessionId) { native.abandonExpiredLinkedTrace(sessionId); },
};

export type { LinkedTraceClient, LinkedTraceEventType, LinkedTraceFinalizedSession, LinkedTracePayload, LinkedTracePreflight, LinkedTraceStatus } from './types';
