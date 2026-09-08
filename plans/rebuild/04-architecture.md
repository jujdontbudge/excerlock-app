# 04 — Architecture, ports, fake data layer, reuse audit

## 1. Where the new app lives

```
ExcerLock/
  app/            ← old app, read-only during Phase 1, archived after Phase 2 ships
  app-next/       ← NEW. Expo SDK 57 workspace. Becomes `app/` at the end of Phase 2.
  server/         ← VPS API (touched only in Phase 2)
  packages/       ← analytics-events reused in Phase 2; condition-model and ledger not used
  plans/rebuild/  ← this plan
  design/motion/  ← Gemini reference study of OtterLife/AppBlock/Unrot (Phase 1 T00 output)
```

`app-next` is added to the root `package.json` workspaces. Node ≥ 22. Expo SDK 57, Expo Router, React
Compiler and typed routes on (as the old app), New Architecture on, `userInterfaceStyle: "light"`,
`supportsTablet: false`, portrait only. Same `app.json` identity fields as `app/app.json` (name, slug,
bundle id, scheme `excerlock`, EAS project id, updates URL, iOS 17.4). **Phase 1 has no native modules, no
extensions, no entitlements and no config plugins beyond expo-router, expo-splash-screen, expo-font,
expo-haptics, expo-build-properties.** It builds as a dev client on the simulator with `expo run:ios`.

## 2. Directory layout inside `app-next/`

```
app-next/
  app.json  app.config.ts  package.json  tsconfig.json  jest.config.js  jest.setup.ts  README.md
  app/                         Expo Router files — thin adapters only (no logic, no styles)
    _layout.tsx                providers: SafeArea, GestureHandlerRoot, AppRuntime (fake or real), fonts
    index.tsx                  boot gate → onboarding | paywall | tabs
    onboarding/[step].tsx      one route, the flow machine picks the screen
    setup/[step].tsx           post-purchase setup sequence
    paywall.tsx
    (tabs)/_layout.tsx  home.tsx  conditions.tsx  analytics.tsx  settings.tsx
    builder.tsx                condition builder (modal)
    settings/[section].tsx  settings/permission/[name].tsx  settings/legal/[doc].tsx  settings/gyms.tsx
    dev.tsx                    dev menu (hidden entry)
  src/
    design-system/             tokens.ts + one file per component + README + __tests__
    motion/                    motion tokens, shared transition presets, haptics wrapper, reduce-motion helpers
    icons/                     SVG icon components + manifest
    content/                   all copy and option lists (typed), fixtures, README
    domain/                    PURE. types, resolveLock, schedule math, progress, streaks, validation, unlock hint. No React, no IO. 100% unit-tested.
    ports/                     interfaces Phase 2 implements (see §3). Fake implementations live in demo/.
    state/                     Zustand stores with persist (profile, rules, lockedApps, ruleDays, session, entitlement, permissions, settings) + selectors
    onboarding/                flow machine: step graph, branch routing, skip rules, progress fraction, resume
    demo/                      FakeRuntime: fake ports, scenarios, clock, dev menu model
    features/
      launch/  onboarding/  setup/  paywall/  home/  conditions/  builder/  analytics/  settings/  sheets/  shield-preview/
      each: screen component(s), hooks, __tests__, README.md
    runtime/                   AppRuntime provider: chooses FakeRuntime (Phase 1) or RealRuntime (Phase 2) from env
  assets/                      icons/ (SVG + FOUNDRY.md), fonts/, images/ (with FOUNDRY.md)
```

Rules: a file has one responsibility and stays under ~200 lines; a folder has a README that says what it owns
and what it must not know; screens import tokens, never literals; `domain/` and `onboarding/` have no React
imports; `features/*` never import `demo/` directly (only through `runtime/`).

## 3. Ports (the Phase 1 ↔ Phase 2 boundary)

Each port is a TypeScript interface in `src/ports/`, with a fake in `src/demo/fakes/` (Phase 1) and a real
adapter in Phase 2. Screens and stores talk only to ports.

| Port | Methods (sketch) | Phase 1 fake | Phase 2 real (ported from old app unless noted) |
| --- | --- | --- | --- |
| `ScreenTimePort` | `authorizationStatus()`, `requestAuthorization()`, `presentAppPicker()` → `LockedApps`, `applyLock(decision: LockDecision, plan: EnforcementPlan)` → `Promise<ApplyResult>` (fail closed, idempotent once applied), `describeSelection()` → `LockedApps`, `observeUsage()` → minutes today | fake list picker, status from scenario, usage from scenario | `app/src/screentime/native/*` (react-native-device-activity), extensions in `app/targets/*` |
| `StepsPort` | `authorizationStatus()`, `request()`, `stepsSince(dayStart)`, `subscribe(cb)` | scenario steps + optional auto-increment | `app/modules/excerlock-motion` + `app/src/signals/motion` |
| `WalkingPort` | `start(rule)`, `stop()`, `observe(cb)` → `WalkingSession`, `treadmillFraming()` | scripted session phases | `app/src/home/signals/walkingSessionController.ts`, `signals/gait`, `signals/placement`, `modules/excerlock-gait-vision` |
| `GymPort` | `searchPlaces(query)`, `savePlace(place)`, `listPlaces()`, `checkIn(placeId)`, `enableAutoDetect()`, `disableAutoDetect()`, `observePresence(cb)` | fake results, scripted presence | `app/src/signals/location/*`, `gymPresenceController.ts`; map search is new (MapKit via `expo-location` geocoding or `react-native-maps`, decided in Phase 2 via Expo MCP docs) |
| `HealthPort` | `authorizationStatus()`, `request()`, `workoutsToday(kind)` → minutes/distance | scenario workouts | `app/src/signals/health/*` (@kingstinct/react-native-healthkit 14.0.2 pinned + patch + background bootstrap plugin) |
| `AuthPort` | `session()`, `signInWithApple()`, `signInWithGoogle()`, `sendEmailCode(email)`, `verifyEmailCode(code)`, `signOut()`, `deleteAccount()`, `subscribe(cb)` | scenario session | Supabase (new) |
| `SubscriptionPort` | `entitlement()`, `presentPaywall(placement)`, `restore()`, `identify(userId)`, `reset()`, `subscribe(cb)` | scenario entitlement, stand-in paywall | Adapty + Paywall Builder (new UI package, existing module logic) |
| `AnalyticsPort` | `track(event, props)`, `screen(name)`, `identify(id)`, `reset()` | in-memory log visible in dev menu | PostHog via `packages/analytics-events` (existing) |
| `NotificationsPort` | `status()`, `request()`, `scheduleTrialReminder(at)`, `scheduleWalkLeaseWarning(at)`, `cancel(id)` | scenario status, log | expo-notifications local (existing adapter, reduced) |
| `SyncPort` | `pushRules(rules)`, `pushRuleDays(days)`, `pull()` | no-op | VPS API (new endpoints) |
| `ClockPort` | `now()`, `timezone()`, `subscribe(cb)` | scenario clock, adjustable in dev menu | system |

## 4. The fake data layer (Phase 1)

`src/demo/FakeRuntime.ts` wires every fake port to one `Scenario`. A scenario is a typed JSON-like object:

```ts
type Scenario = {
  id: string; title: string;
  onboarding: 'fresh' | 'resumeAt:<stepId>' | 'complete';
  profile?: Partial<Profile>;
  rules: Rule[];
  lockedApps: LockedApps;
  ruleDays: RuleDay[];
  clock: { now: string; timezone: string };
  permissions: Permissions;
  session: Session;
  entitlement: Entitlement;
  usageMinutesToday: number | null;
  history: { day: DayKey; usageMinutes: number | null; activity: Record<Activity, number>; met: boolean; scheduled: boolean }[];  // for Analytics
  steps: { today: number; autoIncrementPerSecond?: number };
  walking?: { script: ('verifying' | 'walking' | 'grace' | 'ended')[]; stepMs: number };
  gym?: { places: SavedPlace[]; presence: 'inside' | 'outside' };
  health?: { workoutsToday: { kind: 'running' | 'biking'; minutes: number; km: number }[] };
  fakeSystemPrompts: 'grant' | 'deny' | 'ask';   // how fake permission sheets resolve
};
```

Required scenarios (`src/demo/scenarios/`): `fresh-install`, `onboarding-walking-resume`, `home-locked-walking`,
`home-unlocked-met`, `home-walking-session`, `home-before-window`, `home-no-rules`, `home-permission-needed`,
`home-no-apps`, `gym-arrival-user`, `gym-time-user`, `runner-distance`, `biker-time`, `multi-rule-overlap`,
`window-crosses-midnight`, `trial-active`, `trial-expired`, `billing-issue`, `signed-in-apple`, `analytics-6-weeks`,
`analytics-day-zero`, `analytics-no-measurement`, `dynamic-type-xl` (same as home-locked with the a11y size
flag), `reduce-motion`.

Persistence: stores persist to AsyncStorage under `excerlock-next.*.v1` so the app feels real across launches.
The dev menu can reset to any scenario (which overwrites persisted state) or "keep my edits".

The dev menu (`app/dev.tsx`, 7 taps on the Settings footer, also `excerlock://dev`): scenario list, clock
adjust (+1 h, +1 day, set time), permission toggles, entitlement toggles, fake prompt mode, analytics event log,
component previews, shield preview, "record flow" helper that prints the `xcrun simctl io` command for T15.

## 5. Reuse audit of the old app (what Phase 2 ports, what dies)

| Old location | Disposition | Why |
| --- | --- | --- |
| `app/modules/excerlock-motion` (Swift) | **Port verbatim** (Phase 2) | Tested Core Motion pipe; decision B12 |
| `app/modules/excerlock-gait-vision` (Swift) | **Port verbatim** | Decision B12 |
| `app/targets/*` (3 Screen Time extensions) | **Port**, re-generated by the device-activity plugin with the same app group and team; Swift shield content updated to the new copy model | Decision B12; app group must not change |
| `app/plugins/withNoPush.js`, `withScreenTimeExtensionValidation.js`, `withHealthKitBackgroundBootstrap.js` (+ `.mm`) | **Port verbatim** | Load-bearing plugin order is guardrail-tested |
| `app/src/screentime/**` | **Port** behind `ScreenTimePort`; delete drain-ladder scheduling; add window schedules + usage threshold monitor | Decision B1, B15 |
| `app/src/signals/**` (motion, gait, placement, location, health, timeline; fixtures) | **Port** behind the ports above; delete `signals/vendor` and `signals/screentime` if unused | B10, B12 |
| `app/src/home/signals/walkingSessionController.ts`, `gymPresenceController.ts` | **Port** | B3, B11 |
| `app/src/shield/**` | **Port**, wire causes reduced to `locked`, `lockWindow`, `walkingEnded` | B1 |
| `app/src/lock/model/lockPrecedence.ts` | **Replace** with `domain/resolveLock` | B2, B6 |
| `app/src/harness/**`, `app/src/diagnostics/**`, `scripts/analyze-harness-run.js`, `tools/gait-fixture-extractor` | **Port** as a separate app root behind `EXPO_PUBLIC_TEST_HARNESS=1` | B12 ("all that harness stuff we tested need to keep") |
| `app/src/e2e/**` (scenario deep links, fixture composition root) | **Port the idea** into the dev-menu scenarios (Phase 1) and keep deep-link entry in Phase 2 | Maestro is banned; scenarios still needed |
| `app/src/subscription/**` (Adapty module, entitlement, restore) | **Port logic**, replace custom paywall UI with Paywall Builder view | C6 |
| `app/src/analytics/**`, `app/src/experiments/**`, `packages/analytics-events` | **Port**, update `FLOW_SCREENS` to the new onboarding ids, `distinct_id` = Supabase uid | D4 |
| `app/src/observability/**` (Sentry scrub) | **Port verbatim** | D4 |
| `app/src/account/**` (Clerk) | **Replace** with Supabase adapter behind `AuthPort`; keep the vendor-free `AccountModule` shape and the deletion ordering law (Adapty → PostHog → auth provider last) | D1 |
| `app/src/notifications/**` | **Reduce** to trial reminder + walk-lease warning | B14 |
| `app/src/support/**` | **Port** support composer + HTTP client; drop feature requests | B17 |
| `app/src/review/**` | **Port** the three-stage policy (thresholds re-based on met days) | small, tested |
| `app/src/schedule/**`, `app/src/manage/**`, `app/src/ledger/**`, `app/src/analysis/**` (badges, share cards, heat map), `app/src/shareCards/**`, `packages/ledger` | **Retire** | B1, B9, B16 |
| `app/src/ui/**` (old theme) | **Retire** | C1 |
| `excer-ui-mock/**` | **Retire**; its module shape and test seams are the pattern for `app-next` | superseded twice |
| `server/src/vendors/**`, `routes/vendors.ts`, `routes/vendorWebhooks.ts`, vendor tables | **Delete** (Phase 2) | D6 |
| `server/src/auth.ts` | **Rewrite** for Supabase JWKS | D2 |
| `guardrails/**` | **Port** the relevant tests (plugin order, no-push, native targets, single-emitter, phase-3 production callers) to point at `app-next` | keep the laws |

## 6. Testing stack (both phases)

- `jest-expo` + `@testing-library/react-native` + `jest.setup.ts` mocking Reanimated with `useReducedMotion: () => true`, gesture-handler jest setup, and `expo-haptics`.
- Test seams (from the old mock, proven at 33 suites): (1) domain unit tests, (2) flow-machine tests, (3) component variant tests, (4) rendered-router interaction tests per feature, (5) scenario reachability tests (every scenario boots to its expected screen).
- `npm run typecheck`, `npm test`, `npx expo-doctor`, `npx expo install --check`, `npx expo export --platform ios` must all pass at every task's end.
- Simulator evidence: `xcrun simctl io <udid> recordVideo` per flow for the Gemini gate; screenshots per screen and per scenario in `app-next/evidence/<task>/` (gitignored except the index).

## 7. Environment and tooling

- Expo MCP for every Expo question, dependency add, and build recipe. Codex confirms `/mcp` shows expo connected before T01.
- Simulator: one at a time, headless; create `ExcerLock-Next` (iPhone 17 Pro, latest iOS) if missing; `xcrun simctl shutdown all` when done.
- Gemini runs through the Antigravity CLI: `agy -p "..." --model gemini-3.7-flash-high --dangerously-skip-permissions --add-dir <dir>`, file paths written in the prompt. Never the retired `gemini` binary. See T00.
- No Maestro. No opening Simulator.app unless Johan asks.
