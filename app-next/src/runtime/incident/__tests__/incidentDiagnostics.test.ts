import { buildIncidentDiagnostics, type IncidentDiagnosticsInput } from '../incidentDiagnostics';
import { buildIncidentReportPayload } from '../createIncidentReportPort';
import type { IncidentLogEvent } from '../IncidentLog';

const NOW = Date.parse('2026-09-18T10:15:00.000Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Keys that must never leave the phone. Mirrors the server denylist. */
const forbidden = /^(latitude|longitude|lat|lng|lon|coords|coordinates|email|phone|token|accesstoken|refreshtoken|bundleid|appname|applicationtoken)$/i;
function keysOf(value: unknown, into: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((item) => keysOf(item, into));
  else if (value && typeof value === 'object')
    for (const [key, child] of Object.entries(value)) {
      into.push(key);
      keysOf(child, into);
    }
  return into;
}

const events: IncidentLogEvent[] = [
  { at: '2026-09-18T07:00:00.000Z', state: 'shield', openReason: null, relief: null, result: 'applied' },
  { at: '2026-09-18T08:00:00.000Z', state: 'conditional', openReason: null, relief: 'unlockedWalking', result: 'applied' },
  { at: '2026-09-18T09:00:00.000Z', state: 'shield', openReason: null, relief: null, result: 'applied' },
];

function input(overrides: Partial<IncidentDiagnosticsInput> = {}): IncidentDiagnosticsInput {
  return {
    now: NOW,
    timezone: 'Europe/Stockholm',
    enforcement: {
      revision: 12,
      now: NOW,
      context: { policyGeneration: 12, accountGeneration: 1, selectionVersion: 'v1' },
      state: 'shield',
      relief: 'unlockedWalking',
      eligibleUntil: NOW + HOUR,
      futureEnforcementEligible: true,
      windows: [{ id: 'w', start: NOW - HOUR, end: NOW + HOUR }],
    },
    walking: { ruleId: 'rule-1', phase: 'inactive', since: null, placement: 'unknown', proppedVerified: false, proppedSince: null },
    walkingDetails: { steps: 412, walkingSeconds: 93.6 },
    detection: {
      version: 1,
      generation: 3,
      observedAt: NOW - 5_000,
      walking: {
        version: 1,
        phase: 'inactive',
        watermark: NOW - 5_000,
        qualifyingSince: null,
        activeSince: NOW - 20 * 60_000,
        lastEvidenceAt: NOW - 6 * 60_000,
        lastQualifying: false,
        graceEndsAt: null,
      },
      propped: { version: 1 } as never,
      gym: {
        version: 1,
        watermark: NOW,
        records: [],
        regions: { 'gym-1': { pendingEnterAt: null, confirmedSince: NOW - 30 * 60_000, lastEventAt: NOW - 30 * 60_000 } },
        intervals: [
          { id: 'old', regionId: 'gym-1', enteredAt: NOW - 5 * DAY, confirmedAt: NOW - 5 * DAY, exitedAt: NOW - 5 * DAY + HOUR },
          { id: 'new', regionId: 'gym-1', enteredAt: NOW - 30 * 60_000, confirmedAt: NOW - 30 * 60_000, exitedAt: null },
        ],
        coverageLostAt: {},
      },
      creditedThrough: {},
      pendingHistory: null,
    },
    gymPresence: { placeId: 'gym-1', startedAt: '2026-09-18T09:45:00.000Z', confirmedAt: '2026-09-18T09:45:00.000Z' },
    gymAutoDetect: true,
    savedGyms: 2,
    permissions: { screenTime: 'granted', motion: 'granted', location: 'always', camera: 'notDetermined', notifications: 'granted' },
    rules: [
      {
        id: 'rule-1',
        activity: 'walking',
        mode: { kind: 'target', activity: 'walking', metric: 'steps', goal: 3000 },
        schedule: { days: [1, 2, 3, 4, 5], window: { kind: 'allDay' } },
        enabled: true,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ],
    lockedApps: { isEmpty: false, handle: { token: 'opaque-selection-token' } },
    ruleDays: [
      { ruleId: 'rule-1', day: '2026-09-10', progress: 3000, met: true, metAt: '2026-09-10T12:00:00.000Z' },
      { ruleId: 'rule-1', day: '2026-09-17', progress: 1200, met: false, metAt: null },
      { ruleId: 'rule-1', day: '2026-09-18', progress: 412, met: false, metAt: null },
    ],
    entitlement: { status: 'active', renewsAt: '2026-10-01T00:00:00.000Z' },
    identity: { kind: 'canonical', userId: 'user-1', isAnonymous: true, generation: 1, ready: true },
    stopGraceSeconds: 60,
    notificationsEnabled: true,
    walkingDuration: {
      segments: [
        { from: NOW - 3 * DAY, to: NOW - 3 * DAY + 10 * 60_000, day: '2026-09-15', timezone: 'Europe/Stockholm' },
        { from: NOW - 2 * HOUR, to: NOW - HOUR, day: '2026-09-18', timezone: 'Europe/Stockholm' },
      ],
      millisecondsByDay: { '2026-09-14': 1, '2026-09-15': 600_000, '2026-09-17': 900_000, '2026-09-18': 3_600_000 },
    },
    events,
    ...overrides,
  };
}

test('the snapshot carries the lock decision, detection phases, permissions and last lock/unlock times', () => {
  const d = buildIncidentDiagnostics(input());
  expect(d.capturedAt).toBe('2026-09-18T10:15:00.000Z');
  expect(d.lock).toEqual({
    state: 'shield',
    openReason: null,
    relief: 'unlockedWalking',
    eligibleUntil: '2026-09-18T11:15:00.000Z',
    revision: 12,
    scheduleIssue: null,
    futureEnforcementEligible: true,
  });
  expect(d.lastLockedAt).toBe('2026-09-18T09:00:00.000Z');
  expect(d.lastUnlockedAt).toBe('2026-09-18T08:00:00.000Z');
  expect(d.walking).toMatchObject({
    ruleId: 'rule-1',
    phase: 'inactive',
    activeSince: '2026-09-18T09:55:00.000Z',
    lastEvidenceAt: '2026-09-18T10:09:00.000Z',
    lastQualifying: false,
    graceEndsAt: null,
    steps: 412,
    walkingSeconds: 94,
  });
  expect(d.gym.presence?.placeId).toBe('gym-1');
  expect(d.gym.regions['gym-1'].confirmedSince).toBe('2026-09-18T09:45:00.000Z');
  expect(d.permissions.location).toBe('always');
  expect(d.rules).toEqual([expect.objectContaining({ id: 'rule-1', activity: 'walking', enabled: true })]);
  expect(d.entitlement.status).toBe('active');
  expect(d.identity).toEqual({ kind: 'canonical', isAnonymous: true, ready: true });
  expect(d.events).toEqual(events);
});

test('the snapshot keeps only the recent window and never leaks identity, location or selection handles', () => {
  const d = buildIncidentDiagnostics(input());
  expect(d.gym.recentIntervals.map((interval) => interval.enteredAt)).toEqual(['2026-09-18T09:45:00.000Z']);
  expect(d.recentWalking.segments).toEqual([{ from: '2026-09-18T08:15:00.000Z', to: '2026-09-18T09:15:00.000Z', day: '2026-09-18' }]);
  expect(Object.keys(d.recentWalking.millisecondsByDay)).toEqual(['2026-09-15', '2026-09-17', '2026-09-18']);
  expect(d.ruleDays.map((row) => row.day)).toEqual(['2026-09-17', '2026-09-18']);
  expect(d.lockedApps).toEqual({ isEmpty: false, hasSelection: true });
  expect(d.gym.savedGyms).toBe(2);
  const serialized = JSON.stringify(d);
  expect(serialized).not.toContain('user-1');
  expect(serialized).not.toContain('opaque-selection-token');
  expect(keysOf(d).filter((key) => forbidden.test(key))).toEqual([]);
  expect(serialized.length).toBeLessThan(32_768);
});

test('a report before the first reconcile still describes everything else', () => {
  const d = buildIncidentDiagnostics(input({ enforcement: null, events: [] }));
  expect(d.lock).toBeNull();
  expect(d.lastLockedAt).toBeNull();
  expect(d.lastUnlockedAt).toBeNull();
  expect(d.walking.phase).toBe('inactive');
});

test('the wire payload trims the answers and stamps app and time', () => {
  const diagnostics = buildIncidentDiagnostics(input());
  const payload = buildIncidentReportPayload({
    whatWentWrong: '  Apps stayed locked.  ',
    shouldHaveHappened: ' They should have opened. ',
    app: { version: '1.0.0', build: '2', osVersion: '18.5' },
    now: NOW,
    diagnostics,
  });
  expect(payload).toEqual({
    whatWentWrong: 'Apps stayed locked.',
    shouldHaveHappened: 'They should have opened.',
    app: { version: '1.0.0', build: '2', osVersion: '18.5' },
    reportedAt: '2026-09-18T10:15:00.000Z',
    diagnostics,
  });
  expect(() =>
    buildIncidentReportPayload({ whatWentWrong: 'x', shouldHaveHappened: '   ', app: payload.app, now: NOW, diagnostics }),
  ).toThrow('Both answers are required');
});
