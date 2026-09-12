import { INACTIVE_LINKED_TRACE_STATUS, type LinkedTraceClient } from './types';

export const linkedTrace: LinkedTraceClient = {
  enabled: false,
  async start() { return INACTIVE_LINKED_TRACE_STATUS; },
  async status() { return INACTIVE_LINKED_TRACE_STATUS; },
  record() {},
  async stop() { throw new Error('Unavailable'); },
  async deleteSession() {},
};

export type { LinkedTraceClient, LinkedTraceEventType, LinkedTracePayload, LinkedTraceStatus } from './types';
