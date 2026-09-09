import {
  Activity,
  DayKey,
  Permissions,
  Profile,
  Rule,
  RuleDay,
  LockedApps,
  Session,
  Entitlement,
  WalkingSession,
} from '../domain/types';
export type SavedPlace = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
};
export type HistoryDay = {
  day: DayKey;
  usageMinutes: number | null;
  activity: Record<Activity, number>;
  met: boolean;
  scheduled: boolean;
};
export type Workout = { kind: 'running' | 'biking'; minutes: number; km: number };
export type Scenario = {
  gait?: 'none' | 'walking' | 'still';
  motion?: 'walking' | 'still';
  id: string;
  title: string;
  onboarding: 'fresh' | `resumeAt:${string}` | 'complete';
  profile?: Partial<Profile>;
  rules: Rule[];
  lockedApps: LockedApps;
  ruleDays: RuleDay[];
  clock: { now: string; timezone: string };
  permissions: Permissions;
  session: Session;
  entitlement: Entitlement;
  usageMinutesToday: number | null;
  history: HistoryDay[];
  steps: { today: number; autoIncrementPerSecond?: number };
  walking?: { script: WalkingSession['phase'][]; stepMs: number };
  walkingSession?: WalkingSession;
  gym?: { places: SavedPlace[]; presence: 'inside' | 'outside' };
  health?: { workoutsToday: Workout[] };
  fakeSystemPrompts: 'grant' | 'deny' | 'ask';
  accessibility?: 'xl' | 'reduceMotion';
};
export type Unsubscribe = () => void;
