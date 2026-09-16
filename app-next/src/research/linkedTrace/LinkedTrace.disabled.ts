import { INACTIVE_LINKED_TRACE_STATUS, type LinkedTraceClient } from './types';

export const linkedTrace: LinkedTraceClient = {
  enabled: false,
  async start() { return INACTIVE_LINKED_TRACE_STATUS; },
  async status() { return INACTIVE_LINKED_TRACE_STATUS; },
  async preflight() {
    return {
      labStorageIsolated: false,
      screenTimeAuthorized: false,
      motionReady: false,
      locationAlwaysAuthorized: false,
      canarySelectionValid: false,
      canaryApplicationCount: 0,
      canaryCategoryCount: 0,
      canaryWebDomainCount: 0,
    };
  },
  record() {},
  async stop() { throw new Error('Unavailable'); },
  async finalized() { return []; },
  async exportSession() { throw new Error('Unavailable'); },
  async deleteSession() {},
  async abandonExpiredSession() {},
  async cancelActiveSession() {},
};

export type { LinkedTraceClient, LinkedTraceEventType, LinkedTraceFinalizedSession, LinkedTracePayload, LinkedTracePreflight, LinkedTraceStatus } from './types';
