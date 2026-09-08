import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { LockedApps } from '../../../domain/types';
import { SavedPlace, Workout } from '../../../ports/models';
import { WireEarnedUnlock, WireProfile, WirePull, WireRule, WireRuleDay, WireUsageDay } from '../wire';

/**
 * The privacy law of P2-T02 §3, held at the type level: no app names, bundle ids, coordinates, gym places,
 * gym visits or health samples may appear anywhere in a sync payload. `npm run typecheck` enforces the
 * static assertions; the source scan below runs under jest.
 */
type DeepKeys<T> = T extends readonly (infer Item)[]
  ? DeepKeys<Item>
  : T extends object
    ? { [K in keyof T]-?: K | DeepKeys<T[K]> }[keyof T]
    : never;

type ForbiddenKey =
  | 'appName'
  | 'app_name'
  | 'bundleId'
  | 'bundle_id'
  | 'bundleIdentifier'
  | 'apps'
  | 'handle'
  | 'token'
  | 'latitude'
  | 'longitude'
  | 'lat'
  | 'lng'
  | 'coordinates'
  | 'address'
  | 'placeId'
  | 'place_id'
  | 'placeName'
  | 'places'
  | 'enteredAt'
  | 'entered_at'
  | 'exitedAt'
  | 'exited_at'
  | 'samples'
  | 'workouts'
  | 'heartRate';

type Violations = Extract<DeepKeys<WirePull>, ForbiddenKey>;
const noForbiddenKeys: [Violations] extends [never] ? true : Violations = true;

/** P2-T15's visit row, mirrored structurally so this guard holds before and after that store merges. */
type GymVisit = { id: string; placeId: string; enteredAt: string; exitedAt: string | null; source: 'geofence' | 'manual' };
const gymVisit = {} as GymVisit;
const savedPlace = {} as SavedPlace;
const lockedApps = {} as LockedApps;
const workout = {} as Workout;
// @ts-expect-error a gym visit is not a rule day
const visitAsRuleDay: WireRuleDay = gymVisit;
// @ts-expect-error a gym visit is not an earned unlock
const visitAsUnlock: WireEarnedUnlock = gymVisit;
// @ts-expect-error a saved place is not a rule
const placeAsRule: WireRule = savedPlace;
// @ts-expect-error a saved place is not a profile
const placeAsProfile: WireProfile = savedPlace;
// @ts-expect-error the app selection is not a usage day
const selectionAsUsage: WireUsageDay = lockedApps;
// @ts-expect-error a health workout is not a rule day
const workoutAsRuleDay: WireRuleDay = workout;

const forbiddenWords = /\b(bundleId|bundle_id|bundleIdentifier|latitude|longitude|coordinates|GymVisit|SavedPlace|LockedApps|Workout|HealthSample)\b/;
const sources = readdirSync(join(__dirname, '..'))
  .filter((entry) => /\.tsx?$/.test(entry))
  .map((entry) => [entry, readFileSync(join(__dirname, '..', entry), 'utf8')] as const);

test('the sync adapter never names an app, a place, a visit or a health sample', () => {
  expect(noForbiddenKeys).toBe(true);
  for (const [name, source] of sources) {
    const code = source
      .split('\n')
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join('\n');
    expect({ name, match: code.match(forbiddenWords)?.[0] ?? null }).toEqual({ name, match: null });
  }
  void [visitAsRuleDay, visitAsUnlock, placeAsRule, placeAsProfile, selectionAsUsage, workoutAsRuleDay];
});

test('the wire never imports the gym, health or screen-time ports', () => {
  const wire = sources.find(([name]) => name === 'wire.ts')?.[1] ?? '';
  expect(wire).not.toMatch(/GymPort|HealthPort|ScreenTimePort|PlaceSearch|settingsStore/);
});
