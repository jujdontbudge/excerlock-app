import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EnforcementSnapshot } from '../enforcement/EnforcementHost';

export type IncidentLogEvent = {
  at: string;
  state: EnforcementSnapshot['state'];
  openReason: EnforcementSnapshot['openReason'] | null;
  relief: EnforcementSnapshot['relief'] | null;
  /** What native reported back for the apply; 'failed' when the host threw. */
  result: 'applied' | 'preserved' | 'superseded' | 'failed';
};

export type IncidentLog = {
  /** Keeps the event only when the decision differs from the previous one, so the ring holds transitions, not ticks. */
  record(event: IncidentLogEvent): void;
  read(): IncidentLogEvent[];
  /** Resolves once the persisted ring (if any) has been loaded. */
  ready(): Promise<void>;
};

export const INCIDENT_LOG_KEY = 'excerlock-next.incident-log.v1';
export const INCIDENT_LOG_LIMIT = 40;

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

const sameDecision = (a: IncidentLogEvent | undefined, b: IncidentLogEvent) =>
  a !== undefined && a.state === b.state && a.openReason === b.openReason && a.relief === b.relief && a.result === b.result;

const isEvent = (value: unknown): value is IncidentLogEvent =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as IncidentLogEvent).at === 'string' &&
  typeof (value as IncidentLogEvent).state === 'string' &&
  typeof (value as IncidentLogEvent).result === 'string';

export function createIncidentLog(storage: Storage = AsyncStorage, limit = INCIDENT_LOG_LIMIT): IncidentLog {
  let events: IncidentLogEvent[] = [];
  let writing: Promise<void> = Promise.resolve();
  const persist = () => {
    const snapshot = JSON.stringify(events);
    writing = writing.then(() => storage.setItem(INCIDENT_LOG_KEY, snapshot)).catch(() => undefined);
  };
  const loaded = storage
    .getItem(INCIDENT_LOG_KEY)
    .then((raw) => {
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      // Anything recorded before the load finished stays newest.
      events = [...parsed.filter(isEvent), ...events].slice(-limit);
    })
    .catch(() => undefined);
  return {
    record(event) {
      if (sameDecision(events[events.length - 1], event)) return;
      events = [...events, event].slice(-limit);
      persist();
    },
    read: () => events,
    ready: () => loaded,
  };
}
