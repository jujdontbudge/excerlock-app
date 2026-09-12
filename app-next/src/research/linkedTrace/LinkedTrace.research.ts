import { requireNativeModule } from 'expo-modules-core';

import type {
  LinkedTraceClient,
  LinkedTraceEventType,
  LinkedTracePayload,
  LinkedTraceStatus,
} from './types';

type NativeLinkedTraceModule = {
  startLinkedTrace(sessionId: string, nonce: string): LinkedTraceStatus;
  linkedTraceStatus(): LinkedTraceStatus;
  recordLinkedTrace(eventType: LinkedTraceEventType, operationId: string | null, payload: Record<string, unknown>): boolean;
  stopLinkedTrace(sessionId: string, nonce: string): string;
  deleteLinkedTrace(sessionId: string): void;
};

const native = requireNativeModule<NativeLinkedTraceModule>('ExcerlockEnforcement');

function compact(payload: LinkedTracePayload): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter((entry) => entry[1] !== undefined));
}

export const linkedTrace: LinkedTraceClient = {
  enabled: true,
  async start(sessionId, nonce) { return native.startLinkedTrace(sessionId, nonce); },
  async status() { return native.linkedTraceStatus(); },
  record(eventType, payload, operationId) {
    native.recordLinkedTrace(eventType, operationId ?? null, compact(payload));
  },
  async stop(sessionId, nonce) { return native.stopLinkedTrace(sessionId, nonce); },
  async deleteSession(sessionId) { native.deleteLinkedTrace(sessionId); },
};

export type { LinkedTraceClient, LinkedTraceEventType, LinkedTracePayload, LinkedTraceStatus } from './types';
