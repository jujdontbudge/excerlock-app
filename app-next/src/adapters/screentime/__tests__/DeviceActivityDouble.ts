import {
  DeviceActivityAction,
  DeviceActivityApi,
  DeviceActivityAuthorizationStatus,
  DeviceActivityEvent,
  DeviceActivityEventRecord,
  DeviceActivitySchedule,
  SelectionMetadata,
} from '../deviceActivity';

export type RegisteredMonitor = { schedule: DeviceActivitySchedule; events: readonly DeviceActivityEvent[] };
export type ConfiguredActions = {
  activityName: string;
  callbackName: string;
  eventName?: string;
  actions: DeviceActivityAction[];
};

/**
 * An in-memory DeviceActivity. It records what the adapter asked the OS to do; it does not
 * simulate iOS. Everything it cannot answer — whether a schedule actually fires, whether a
 * shield renders — is a P2-T11 device question.
 */
export function deviceActivityDouble(
  options: { authorization?: DeviceActivityAuthorizationStatus; selection?: SelectionMetadata | null } = {},
) {
  const shared = new Map<string, unknown>();
  const monitors = new Map<string, RegisteredMonitor>();
  const configured: ConfiguredActions[] = [];
  const recorded: DeviceActivityEventRecord[] = [];
  const listeners = new Set<(event: { callbackName: string }) => void>();
  const cleaned: string[] = [];
  let blocked = false;
  let authorization: DeviceActivityAuthorizationStatus = options.authorization ?? 2;
  let selection: SelectionMetadata | null =
    options.selection === undefined ? { applicationCount: 4, categoryCount: 2 } : options.selection;
  let failNextStart = false;
  let requests = 0;

  const api: DeviceActivityApi = {
    authorizationStatus: () => authorization,
    requestAuthorization: async () => {
      requests += 1;
      authorization = authorization === 0 ? 2 : authorization;
    },
    getFamilyActivitySelectionId: (id) => (selection ? `token:${id}` : undefined),
    selectionMetadata: () => selection ?? undefined,
    setSharedValue: (key, value) => void shared.set(key, value),
    getSharedValue: <T,>(key: string) => shared.get(key) as T | undefined,
    blockSelection: () => void (blocked = true),
    unblockSelection: () => void (blocked = false),
    configureActions: (input) => void configured.push({ ...input, actions: [...input.actions] }),
    startMonitoring: async (activityName, schedule, events) => {
      if (failNextStart) {
        failNextStart = false;
        throw new Error('startMonitoring failed');
      }
      monitors.set(activityName, { schedule, events });
    },
    stopMonitoring: (activityNames) => {
      if (!activityNames) monitors.clear();
      else activityNames.forEach((name) => monitors.delete(name));
    },
    getActivities: () => [...monitors.keys()],
    cleanUpAfterActivity: (activityName) => {
      cleaned.push(activityName);
      for (let index = recorded.length - 1; index >= 0; index--) {
        if (recorded[index].activityName === activityName) recorded.splice(index, 1);
      }
    },
    getEvents: (activityName) =>
      activityName ? recorded.filter((event) => event.activityName === activityName) : [...recorded],
    isShieldActive: () => blocked,
    onDeviceActivityMonitorEvent: (listener) => {
      listeners.add(listener);
      return { remove: () => void listeners.delete(listener) };
    },
  };

  return {
    api,
    get blocked() {
      return blocked;
    },
    get monitors() {
      return monitors;
    },
    get configured() {
      return configured;
    },
    get shared() {
      return shared;
    },
    get cleaned() {
      return cleaned;
    },
    get authorizationRequests() {
      return requests;
    },
    actionsFor(activityName: string, callbackName: string) {
      return configured.filter((entry) => entry.activityName === activityName && entry.callbackName === callbackName).at(-1);
    },
    setAuthorization(next: DeviceActivityAuthorizationStatus) {
      authorization = next;
    },
    setSelection(next: SelectionMetadata | null) {
      selection = next;
    },
    failNextStartMonitoring() {
      failNextStart = true;
    },
    /** The monitor extension reached a usage threshold and recorded it in the app group. */
    fireThreshold(activityName: string, eventName: string, at: string) {
      recorded.push({ activityName, callbackName: 'eventDidReachThreshold', eventName, lastCalledAt: new Date(at) });
      listeners.forEach((listener) => listener({ callbackName: 'eventDidReachThreshold' }));
    },
    /** The extension ran an action list — a window started or ended without the app. */
    emitMonitorEvent(callbackName: string, shields?: 'up' | 'down') {
      if (shields) blocked = shields === 'up';
      listeners.forEach((listener) => listener({ callbackName }));
    },
  };
}
