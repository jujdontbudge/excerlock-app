import type { Entitlement, GymPresence, Permissions, Rule, RuleDay } from '../../domain/types';
import type { WalkingStatus } from '../../ports/WalkingPort';
import type { AuthIdentity } from '../../ports/AuthPort';
import type { EnforcementSnapshot } from '../enforcement/EnforcementHost';
import type { DetectionData } from '../../state/detectionStore';
import type { WalkingDurationState } from '../detection/WalkingDurationLedger';
import type { IncidentLogEvent } from './IncidentLog';
import { addDays, dayKey } from '../../domain/calendar';

/** What the app believed when the person pressed Send. Everything here is state the app already keeps;
 * nothing names an app, a place on a map, an address or a token. */
export type IncidentDiagnostics = {
  capturedAt: string;
  timezone: string;
  lock: null | {
    state: EnforcementSnapshot['state'];
    openReason: EnforcementSnapshot['openReason'] | null;
    relief: EnforcementSnapshot['relief'];
    eligibleUntil: string | null;
    revision: number;
    scheduleIssue: EnforcementSnapshot['scheduleIssue'] | null;
    futureEnforcementEligible: boolean;
  };
  /** From the transition log: when the runtime last applied a shield, and last applied an open or conditional relief. */
  lastLockedAt: string | null;
  lastUnlockedAt: string | null;
  walking: WalkingStatus & {
    activeSince: string | null;
    lastEvidenceAt: string | null;
    lastQualifying: boolean | null;
    graceEndsAt: string | null;
    steps: number;
    walkingSeconds: number;
  };
  gym: {
    presence: GymPresence | null;
    autoDetect: boolean;
    savedGyms: number;
    regions: Record<string, { pendingEnterAt: string | null; confirmedSince: string | null; lastEventAt: string | null }>;
    recentIntervals: { regionId: string; enteredAt: string; confirmedAt: string; exitedAt: string | null }[];
  };
  permissions: Permissions;
  rules: Pick<Rule, 'id' | 'activity' | 'mode' | 'schedule' | 'enabled'>[];
  lockedApps: { isEmpty: boolean; hasSelection: boolean };
  ruleDays: RuleDay[];
  entitlement: Entitlement;
  identity: Pick<AuthIdentity, 'kind' | 'isAnonymous' | 'ready'>;
  settings: { stopGraceSeconds: number; notificationsEnabled: boolean };
  recentWalking: {
    segments: { from: string; to: string; day: string }[];
    millisecondsByDay: Record<string, number>;
  };
  detection: { generation: number; observedAt: string | null };
  /** Newest last. Lock/unlock transitions the runtime applied, so a report shows what changed and when. */
  events: IncidentLogEvent[];
};

export type IncidentDiagnosticsInput = {
  now: number;
  timezone: string;
  /** Null before the first reconcile finished. */
  enforcement: EnforcementSnapshot | null;
  walking: WalkingStatus;
  walkingDetails: { steps: number; walkingSeconds: number };
  detection: DetectionData;
  gymPresence: GymPresence | null;
  gymAutoDetect: boolean;
  savedGyms: number;
  permissions: Permissions;
  rules: Rule[];
  lockedApps: { isEmpty: boolean; handle: unknown };
  ruleDays: RuleDay[];
  entitlement: Entitlement;
  identity: AuthIdentity;
  stopGraceSeconds: number;
  notificationsEnabled: boolean;
  walkingDuration: Pick<WalkingDurationState, 'segments' | 'millisecondsByDay'>;
  events: IncidentLogEvent[];
};

const RECENT_WINDOW_MS = 48 * 60 * 60 * 1000;
const MAX_INTERVALS = 10;
const MAX_SEGMENTS = 40;

const iso = (ms: number | null | undefined): string | null =>
  ms == null || !Number.isFinite(ms) ? null : new Date(ms).toISOString();

export function buildIncidentDiagnostics(input: IncidentDiagnosticsInput): IncidentDiagnostics {
  const { enforcement, detection } = input;
  const since = input.now - RECENT_WINDOW_MS;
  const lastLockedAt = [...input.events].reverse().find((event) => event.state === 'shield')?.at ?? null;
  const lastUnlockedAt =
    [...input.events].reverse().find((event) => event.state === 'open' || event.state === 'conditional')?.at ?? null;
  const earliestDay = addDays(dayKey(new Date(input.now).toISOString(), input.timezone), -2);
  return {
    capturedAt: new Date(input.now).toISOString(),
    timezone: input.timezone,
    lock: enforcement && {
      state: enforcement.state,
      openReason: enforcement.openReason ?? null,
      relief: enforcement.relief,
      eligibleUntil: iso(enforcement.eligibleUntil),
      revision: enforcement.revision,
      scheduleIssue: enforcement.scheduleIssue ?? null,
      futureEnforcementEligible: enforcement.futureEnforcementEligible,
    },
    lastLockedAt,
    lastUnlockedAt,
    walking: {
      ...input.walking,
      activeSince: iso(detection.walking.activeSince),
      lastEvidenceAt: iso(detection.walking.lastEvidenceAt),
      lastQualifying: detection.walking.lastQualifying,
      graceEndsAt: iso(detection.walking.graceEndsAt),
      steps: input.walkingDetails.steps,
      walkingSeconds: Math.round(input.walkingDetails.walkingSeconds),
    },
    gym: {
      presence: input.gymPresence,
      autoDetect: input.gymAutoDetect,
      savedGyms: input.savedGyms,
      regions: Object.fromEntries(
        Object.entries(detection.gym.regions).map(([id, region]) => [
          id,
          {
            pendingEnterAt: iso(region.pendingEnterAt),
            confirmedSince: iso(region.confirmedSince),
            lastEventAt: iso(region.lastEventAt),
          },
        ]),
      ),
      recentIntervals: detection.gym.intervals
        .filter((interval) => (interval.exitedAt ?? input.now) >= since)
        .slice(-MAX_INTERVALS)
        .map((interval) => ({
          regionId: interval.regionId,
          enteredAt: new Date(interval.enteredAt).toISOString(),
          confirmedAt: new Date(interval.confirmedAt).toISOString(),
          exitedAt: iso(interval.exitedAt),
        })),
    },
    permissions: input.permissions,
    rules: input.rules.map(({ id, activity, mode, schedule, enabled }) => ({ id, activity, mode, schedule, enabled })),
    lockedApps: { isEmpty: input.lockedApps.isEmpty, hasSelection: input.lockedApps.handle !== null },
    ruleDays: input.ruleDays.filter((row) => row.day >= earliestDay),
    entitlement: input.entitlement,
    identity: { kind: input.identity.kind, isAnonymous: input.identity.isAnonymous, ready: input.identity.ready },
    settings: { stopGraceSeconds: input.stopGraceSeconds, notificationsEnabled: input.notificationsEnabled },
    recentWalking: {
      segments: input.walkingDuration.segments
        .filter((segment) => segment.to >= since)
        .slice(-MAX_SEGMENTS)
        .map((segment) => ({
          from: new Date(segment.from).toISOString(),
          to: new Date(segment.to).toISOString(),
          day: segment.day,
        })),
      millisecondsByDay: Object.fromEntries(
        Object.entries(input.walkingDuration.millisecondsByDay)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-3),
      ),
    },
    detection: { generation: detection.generation, observedAt: detection.observedAt ? iso(detection.observedAt) : null },
    events: input.events,
  };
}
