# ExcerLock — Architecture (DRAFT for reaction)

> Ticket #14. Sources of truth: `excerlock-app-prd.md` (spec of record), the four research docs in
> `docs/research/` (#16 device-activity-gaps · #17 healthkit-coverage · #18 vendors/ · #21 swift-modules),
> and the map decisions in #1 (Expo+RN · TDD · simulator loop with mocked signal boundary + device smoke
> suite · all Tier-1 vendors in v1 · Azure VM). Visual assets are governed by `design/STYLE.md` (four asset
> families); this document references that framework and never restates it.
>
> **Status: DRAFT — nothing here is final until Johan reacts.** Open questions are collected in §8.

---

## 1. Monorepo layout

One private monorepo, npm workspaces, Node ≥ 22. The app and server are products; `packages/` holds the
pure shared brains; everything else is support.

```
/
├── app/                          # The Expo app (expo-dev-client builds only — never Expo Go)
│   ├── app/                      # expo-router file routes — THIN: parse params, render a screen from src/
│   ├── src/
│   │   ├── conditions/           # ConditionEngine bindings: stores, builder/picker logic (math in packages/)
│   │   ├── ledger/               # Ledger bindings: ledgerStore, persistence, App-Group snapshot mirror
│   │   ├── signals/              # SignalKit — one directory per provider (health/, motion/, location/, screentime/, vendor/)
│   │   ├── shield/               # ShieldController — the only writer of react-native-device-activity
│   │   ├── onboarding/           # FLOW rail: flow.ts array, central renderer, onboardingStore
│   │   ├── experiments/          # ExperimentRail: typed flag registry + the one provider
│   │   ├── analytics/            # AnalyticsKit client emitter (types live in packages/)
│   │   ├── paywall/              # PaywallGate predicate + Adapty adapter
│   │   ├── notifications/        # local notification scheduling + the deep-link map
│   │   ├── settings/             # settings screens' domain logic (permissions health panel, exports, support composer)
│   │   ├── debug/                # hidden debug menu (dev/TestFlight only)
│   │   └── ui/                   # theme, shared components, condition-card variants
│   ├── modules/excerlock-motion/ # local Expo Module (Swift): CMMotionActivity + CMPedometer pipe (#21)
│   ├── targets/app-intents/      # App Intents extension via @bacons/apple-targets (#21)
│   ├── plugins/                  # config plugins: withNoPush (FIRST in the array), healthkit plugin patch shim
│   └── patches/                  # patch-package: @kingstinct/react-native-healthkit 14.0.2 plugin fix (#17 G1)
├── server/                       # Fastify + Drizzle + Postgres — mirrors reform/server/src layout:
│   └── src/                      #   index.ts · instrument.ts (Sentry first) · env.ts · config.ts · auth.ts
│       ├── routes/               #   /v1/* — health, support, user, vendors
│       ├── vendors/              # VendorSync: OAuth proxy, atomic token store, per-vendor adapters, webhook receivers
│       ├── webhooks/             #   Adapty receiver (timing-safe secret, Regen safeEquals pattern)
│       ├── db/                   #   drizzle schema + migrations
│       ├── services/  jobs.ts  analytics.ts (posthog-node)
│       └── …
├── packages/                     # Pure shared TypeScript. No React, no RN, no I/O. vitest.
│   ├── condition-model/          # ConditionEngine: §3.3 kinds, catalog, uniqueness/overlap, evaluation
│   ├── ledger/                   # Ledger: balance/drain/earn/rollover math, drain-ladder planning
│   └── analytics-events/         # the typed event-name unions + per-event owner (client|server|adapty)
├── e2e/                          # Maestro flows + the fixture-timeline manifests they run against
├── deploy/                       # exists: azure-provision.sh, cloud-init.yaml (#19); grows deploy.sh, Caddyfile, systemd unit
├── design/                       # exists: STYLE.md (visual law), mockups, style guide
├── docs/                         # exists: research/, build specs, credentials.md (paths only)
└── prototype/                    # existing Codex UI prototype — FROZEN as reference; harvested, never extended (§8 Q1)
```

Dependency direction (enforced, §5): `packages/` import nothing from `app/` or `server/`. `app/` and
`server/` import from `packages/`. Server may import `analytics-events` and `condition-model` **types**
only — the server never computes balances (PRD §10.1); `packages/ledger` is client-only by rule.

---

## 2. The deep modules

Each is one directory, one README, one public surface (`index.ts`), and a test suite that runs without
touching anything below its boundary. Contracts:

**ConditionEngine** (`packages/condition-model`) — owns the §3.3 model as pure data + pure functions: the
three kinds with the strict kind→reward mapping; the v1 catalog (including per-entry metadata like the
exercise-minutes Watch-dependency from #17 G2 and connected-app-only entries); the uniqueness key
`(kind + signal + source + place)`; the event×rate exclusion on same signal+source; and picker availability
— given the user's current conditions and connected sources, it returns every catalog entry as
`available | taken(reason) | blocked(reason) | hidden`, so the builder UI renders verdicts instead of
computing rules. Its second half is evaluation: given a condition set, today's signal snapshots/deltas
(from SignalKit), and the clock as an argument, it emits domain outcomes — `eventFired`, `rateCredit(delta)`,
`stateEntered/Exited` — as plain data for the Ledger. No I/O, no Date.now(), no store imports.

**Ledger** (`packages/ledger`) — pure balance math over an append-only day journal: base allowance at the
day boundary, earn credits (fixed chunk / rest-of-day / set period / rate credits), drain ticks from the
screen-time ladder, rollover with cap, Full-Lock as the allowance=0 degenerate case. Entries are keyed
`(source, id)` so replay is idempotent (HealthKit anchors, workout UUIDs, tick event names map straight
in). It answers `remainingMinutes(at)`, produces per-day summary records for stats/streaks (§3.13), and —
critically — computes the **desired OS state**: `{shieldsUp | shieldsDown, drainThresholds[]}` that
ShieldController must reconcile against. The drain-ladder re-arm math (how many 1-minute events to arm,
given minutes already spent — #16 M3/M5) lives here as pure functions so it's exhaustively unit-testable.

**SignalKit** (`app/src/signals`) — **THE pattern, standardized per #21: every signal is a provider
interface + a native implementation + a fixture implementation.** Five providers:
`HealthProvider` (#17's shape: `requestAuth / getNewSamples(signal, sinceAnchor) / getTodayTotal(signal) /
onChange`), `MotionProvider` (#21's shape, verbatim), `LocationProvider` (geofence regions, presence
checks, walk-session keep-alive via expo-location/task-manager), `ScreenTimeProvider` (the **read** side
of react-native-device-activity: tick-event history via `getEvents`, monitor callbacks), and
`VendorProvider` (per-vendor today-fetch through the server proxy). The condition engine, walk verifier
(`WalkVerifier` lives here, JS, per #21), and every screen see only the interfaces. Fixture impls replay
scripted timelines (§5); selection happens once at the composition root (availability + build flag + debug
menu override) — zero conditional code in screens. Per #17 the Health mock boundary is deliberately thin:
sim tests run real HealthKit with a seeding harness for most paths; fixtures cover only source-attribution
variety, appleExerciseTime, and background wakes.

**ShieldController** (`app/src/shield`) — the **write** side of react-native-device-activity, and the only
module allowed to import its imperative API (guardrail-tested, §5). It exposes one verb —
`reconcile(desired)` — plus walk-session primitives, and translates Ledger-desired state into RNDA calls:
block/unblock by persisted selection id, the day-boundary monitor, the 1-minute drain ladder
(threshold-event ladder per #16 M5), full stop/start **re-arm with `includesPastActivity: true` on every
balance change** (M3), the Walk & Scroll renewable increment via the backdated-interval pattern with
OS-side `blockSelection` on lapse (M12), and state-fresh shield configs (pre-written per-state copy, M7).
`reconcile()` is idempotent and runs on every app open and background wake, so a missed wake never leaves
OS state drifted. It implements the same interface+fixture pattern as SignalKit (FamilyControls is dead on
simulator): the fixture is a recorder that captures the exact call sequence for assertions.

**VendorSync** (`server/src/vendors`) — the server-side vendor module. Owns: OAuth code exchange (client
secrets live only here), the connections store with **atomic token rotation** — the new
access+refresh pair is persisted in the same transaction that marks the old pair consumed, *before* the
response is returned, because Strava/Oura/Whoop rotate refresh tokens on every use and a crash
mid-rotation bricks the connection (#18); Polar's non-expiring token is the schema's nullable case.
Per-vendor fetch-today adapters normalize to one `VendorActivity` shape; an app-wide rate-limit meter
(Strava's 100 reads/15 min is the binding constraint); and **webhook-ready** receivers (routes + HMAC
verification scaffolded for all four vendors even though v1 polls). Retention law: raw vendor payloads
**transit only** — evaluated on-device per PRD §5, never persisted server-side; the store holds tokens,
connection state, and derived outcomes only. The client half is just SignalKit's `VendorProvider` +
cross-source dedup (±time-window + activity-family match, #18) which runs in the app beside the engine.

**AnalyticsKit** (`packages/analytics-events` + `app/src/analytics` + `server/src/analytics.ts`) — the
typed event system: a string-literal union of every allowed event name with a declared **owner**
(`client | server | adapty`) per event — untyped `capture()` doesn't compile, and a guardrail test (§5)
enforces single-emitter. Client wrapper clones Regen's `analytics.ts`: graceful no-op without a key,
`register({app: 'excerlock'})`, `primeDeviceIdForFlags()`, manual `trackScreen` only. Dev builds keep a
ring buffer of emitted events for the debug menu's event console.

**PaywallGate** (`app/src/paywall`) — one pure predicate (`isPremium(entitlementState)`) as the only
entitlement question in the codebase, fed by an Adapty adapter (SDK init, placement fetch,
fallback-paywall loading). Screens ask the gate, never the SDK. The debug menu's simulated-entitlement
override is an input to the adapter, not a branch in the gate.

**FLOW onboarding rail** (`app/src/onboarding`) — Regen's §10.5 mechanism verbatim: one `flow.ts` array is
the single source of truth for screen order; one central renderer; `trackOnboardingScreen` /
`trackOnboardingAnswer` called **only** from the renderer; zustand+AsyncStorage `onboardingStore` with a
one-shot server sync at sign-up. v1 ships the deliberately-basic five-screen flow, but polish later is an
array edit, not a rebuild, and PostHog flags can re-order/include screens remotely.

**ExperimentRail** (`app/src/experiments`) — Regen's guard-railed rail: `experiments.ts` typed flag
registry (pure, no SDK imports); `ExperimentVariantProvider.tsx` is the **only** file that may call
`useFeatureFlag` (fs-walking guardrail test, §5); `$device_id` bucketing; control renders instantly and a
variant applies only if the flag arrives ≤ 500 ms; `exp-*`/`gate-*` naming. Price/paywall experiments
live in Adapty, never here (PRD D7).

Supporting modules (deliberately shallow, still one-dir-one-README): `notifications/` (schedules the §3.14
local notifications and owns the deep-link map as a tested route table), `settings/`, `debug/`, `ui/`.

---

## 3. Decisions (with rationale)

**D1 — Minimum iOS = 17.4.** Two independent findings force the same floor:
(a) #16 G3/M3 — mid-day threshold re-arm needs `includesPastActivity`, which is iOS 17.4+. Below it, every
earn-driven re-arm forgets the day's already-spent usage and **over-grants screen time — a correctness
hole in the core economy**, avoidable only via a fiddly tick-offset compensation engine we'd have to build
and test on a second code path. (b) #21 — the App Intents extension can host `AppShortcutsProvider` only
on iOS 17+; below that, Siri answers require a full RN app boot. Setting 17.4 deletes both fallback code
paths.
*What's given up:* every iOS-17-capable device (iPhone XS/XR and later, 2018+) can run 17.4, so no device
class is lost — only users who haven't applied a point update, plus the iPhone 8/X generation stuck on
iOS 16. For a 2026 launch of a new app this is a marginal sliver of the paying market, and they'd have
gotten a subtly broken economy. Enforced via `expo-build-properties` `deploymentTarget: "17.4"`, the same
value in every target config (`targets/app-intents`, RNDA's three), and a guardrail test (§5).

**D2 — HealthKit: pin `@kingstinct/react-native-healthkit@14.0.2` + patch-package.** v14's native
cold-launch background-delivery engine is the point of the library, but the published config plugin never
injects `setupBackgroundObservers()` into AppDelegate (#17 G1 — fix merged upstream, unreleased). So:
exact-pin 14.0.2, carry the small compiled-plugin fix in `app/patches/`, and a CI assert that the
post-prebuild AppDelegate contains the call (silent-failure mode — never trust it). 13.4.0 is the named
escape hatch if #352 (auth-sheet flash) bites; upgrade the moment the next release lands. Same posture for
`react-native-device-activity` 0.6.1: exact pins, patch-package in the toolchain, fork-readiness budgeted
(both libraries are one maintainer — #16 G8/#17 G7).

**D3 — State management: zustand + AsyncStorage, engines stay pure.** PRD §10.8/§10.9 already names the
pair and Regen proves it. Pattern: `packages/` engines own all math; zustand stores
(`ledgerStore`, `conditionsStore`, `walkSessionStore`, `settingsStore`, `onboardingStore`) own
persistence and orchestration and are the only stateful layer; screens subscribe to stores. Persistence is
`zustand/persist` on AsyncStorage — the data volume is condition configs + per-day summary records, which
is tiny (today-only evaluation, PRD §3.3), so no SQLite/MMKV in v1. Exceptions: OAuth/Clerk tokens go in
`expo-secure-store` only; the App-Group balance snapshot (`intents.balance.snapshot`, #21's contract) is
mirrored via RNDA's `userDefaultsSet` on every ledger mutation so the intents extension and shield copy
stay state-fresh.

**D4 — Navigation: expo-router** (PRD §10.9, locked). Route files stay thin — screens live in `src/` and
routes just mount them. Typed routes on. The §3.14 notification deep-link map is a single constant mapping
notification type → route, with a test asserting every notification type has a live route.

**D5 — Debug menu = the composition root's switchboard.** Reached by 7 taps on the Settings version footer
(PRD §3.15), lives in `app/src/debug/`, present in dev + TestFlight builds and compiled out of App Store
builds via an EAS-profile env flag. It hooks in only at seams that already exist: experiment-flag override
layer (ExperimentRail reads overrides before PostHog), simulated entitlement (input to the Adapty
adapter), onboarding reset (onboardingStore), PostHog event console (AnalyticsKit's dev ring buffer), and
— the architectural earn — **SignalKit fixture selection**: any provider can be switched to any fixture
timeline at runtime on dev builds, which is what makes every screen demoable and Maestro-drivable without
a device.

**D6 — Server mirrors `reform/server` exactly.** Same `src/` skeleton (`instrument.ts` Sentry-first,
`env.ts`, `auth.ts` Clerk-JWT, `routes/`, `webhooks/`, `jobs.ts` in-process cron, `db/` drizzle,
vitest + pglite in `test/`), same three-file deploy (rsync `deploy.sh` → systemd unit → Caddy) added to
the existing `deploy/` next to the Azure provisioning scripts from #19. New code is essentially only
`vendors/` and the support route — everything else is a proven clone.

---

## 4. TDD conventions

**Law (from the map): test first.** A module's first commit is its README (contract) + a failing test.
Red-green-refactor; no implementation PR without the test that forced it.

**Tooling:** `vitest` for `packages/` and `server/` (pglite for DB tests) — fast, RN-free.
`jest-expo` + `@testing-library/react-native` for `app/` unit/component tests. Maestro in `e2e/` for the
simulator loop (functional + visual, loop-until-perfect), all on fixture providers via dev-build launch
config. Physical-device smoke suite (shields/geofence/motion/HealthKit-wake) is a written checklist per
milestone, not CI.

**The fixture/timeline pattern (shared across all of SignalKit):** a fixture is a named, versioned list of
`{atMs, event, payload}` rows played onto a virtual clock — fake timers in unit tests, accelerated real
time under Maestro. Canonical libraries ship *with the first test file* of each provider: motion (#21's
seven: `steady-walk`, `red-light`, `stop-for-good`, `drive-off`, `shaky-cheat`, `late-classification`,
`denied-permission`), health (day timelines with mixed `sourceRevision`s for dedup, manual-entry samples,
a background-wake replay), screen-time (tick ladders incl. jitter and re-arm races), location
(enter/exit/blip), vendor (recorded JSON per vendor incl. Strava manual/trainer activities, Whoop
`PENDING_SCORE`, Polar no-flag cases). Fixtures are data files in the module's `fixtures/` dir; e2e
manifests reference them by name.

**What each deep module's suite looks like:**
- *ConditionEngine:* table-driven — every catalog entry × uniqueness/exclusion case (the picker-verdict
  matrix is one table test); evaluation tests feed timeline snapshots and assert emitted outcomes.
- *Ledger:* replay-idempotence (same journal twice ⇒ same state), rollover caps, boundary reset,
  Full-Lock, and the re-arm math (spent-minutes ⇒ exact threshold set) as pure-function tests.
- *SignalKit:* one **contract-test suite per provider interface, run against both impls** — fixture always;
  the native HealthProvider additionally runs it on simulator against real HealthKit via the seeding
  harness (#17: `saveQuantitySample`/`saveWorkoutSample`, incl. `HKWasUserEntered` filter proof).
- *ShieldController:* recorder-fixture asserts exact RNDA call sequences per scenario (earn mid-day ⇒
  stop → start with `includesPastActivity` + correct ladder; walk tick ⇒ unblock + backdated monitor).
- *VendorSync (server):* mocked vendor HTTP; the token-rotation crash test (kill between vendor response
  and DB commit ⇒ connection recoverable, never bricked); rate-meter behavior at the Strava budget;
  webhook HMAC verification.
- *FLOW / ExperimentRail:* renderer-only instrumentation (a screen added to the array is instrumented with
  zero new code), flag-arrival ≤ 500 ms control-first behavior.

**The fs-walking guardrail tests** (plain jest/vitest tests that read the repo; all CI-blocking):
1. **Flag-read guardrail** — no file except `ExperimentVariantProvider.tsx` imports the flag hook (Regen's
   test, copied).
2. **Plugin order** — `withNoPush` is FIRST in the `app.json` plugins array (plugins apply LIFO, §10.8).
3. **AppDelegate assert** — post-prebuild AppDelegate contains `setupBackgroundObservers()` (D2 / #17 G1).
4. **Prebuild survival** — all five native targets (app + 3 RNDA + app-intents) and their entitlements
   survive `prebuild --clean` (#21 risk 7).
5. **RNDA import guardrail** — only `shield/` and `signals/screentime/` import
   `react-native-device-activity`.
6. **Single-emitter** — every event in `analytics-events` has exactly one owner and no `capture` call site
   on the wrong side.
7. **Min-iOS** — `17.4` in expo-build-properties and every target config (D1).

---

## 5. Agent-navigability rules

- **One deep module per directory.** A directory is a module iff it has a `README.md`; the README states
  the contract (what it promises, what it hides), its invariants, its fixture list, and the one-line test
  command. Agents read READMEs before code.
- **File-size caps:** soft 200 lines, hard 300 (tests exempt to 400). Hitting the cap means the file has
  two responsibilities — split it.
- **One exported concern per file.** `index.ts` per module is the public surface; cross-module deep
  imports (`…/shield/internal/x`) are forbidden (lint rule + review).
- **Naming:** provider interfaces `<Signal>Provider`, impls `Native<Signal>Provider` /
  `Fixture<Signal>Provider`; stores `<domain>Store.ts`; screens `<Name>Screen.tsx`; fixtures
  kebab-case named after the story they tell (`red-light`, not `fixture2`).
- **Tests live beside code** (`__tests__/` per module), fixtures in `fixtures/` per module — everything an
  agent needs to understand a module is inside its directory.
- **Never guess Expo APIs** — the Expo MCP is mandatory for docs/library operations (AGENTS.md law).

---

## 6. Build order (phases — consistent with #21's recommendation)

Each phase ends green: its tests pass in CI and the Maestro loop covers its screens.

- **Phase 0 — scaffold:** workspaces, CI, guardrail-test skeletons (they fail-fast from day one),
  `scripts/check-env.ts` doctor, `deploy/` server bring-up on the Azure box (#19 scripts), FamilyControls
  distribution-entitlement requests filed (§5 PRD — launch-gating, file at bundle-ID creation), vendor
  app registrations + Oura/Whoop approval filings (#18 — 10-user caps make this long-lead).
- **Phase 1 — fixtures + pure engines (no UI, no native):** `condition-model`, `ledger`, the timeline
  format, all five fixture providers, `WalkVerifier`. Pure TDD; this is where the economy's correctness
  is won.
- **Phase 2 — UI on mocks:** tabs, Home condition cards (three kind variants), Manage + builder sheet
  (picker verdicts from ConditionEngine), Analysis, Settings, basic FLOW onboarding, shield-copy states —
  all against fixture providers, Maestro loop running. Analytics instrumentation is written here in no-op
  mode (keys land in Phase 5).
- **Phase 3 — native modules + the §5 device spikes:** ShieldController native impl + drain-ladder/re-arm
  spikes (#16 spikes 1–2), native HealthProvider + sim seeding harness + background-wake device case,
  `excerlock-motion` + walk watchdog (spike 3, incl. the shield-deep-link G1 experiment), App Intents
  target **last** (its inputs — balance-snapshot schema, tick-key shape — only stabilize here). Device
  smoke checklist starts.
- **Phase 4 — vendors:** VendorSync on the server (OAuth proxy, atomic token store, adapters, rate meter,
  webhook-ready routes), `VendorProvider` in the app, cross-source dedup, connected-app catalog extras.
- **Phase 5 — money + accounts + analytics wiring:** Clerk, Adapty (paywall placements, fallback bundle,
  webhook mirror), PostHog live (dashboards, funnels), Sentry both sides, support pipeline, ExperimentRail
  live.
- **Phase 6 — e2e hardening:** full Maestro suite loop-until-functionally-and-visually-perfect, device
  smoke suite per milestone, App Store submission mechanics (separate map ticket).

---

## 7. What this document deliberately does not decide

Every §8 number in the PRD (allowances, ratios, cooldowns, caps, preset values) — those are tuning
decisions on top of this structure. Visual design — `design/STYLE.md` and the mockup chain govern it.
App Store submission mechanics, Adapty experiment configs, banner-library production — later map tickets.

---

## 8. Open questions for Johan

1. **`prototype/` fate.** Recommendation: freeze it as a harvest-only reference (components/styles get
   copied into `app/src/ui` as needed) and build `app/` fresh on this architecture. Alternative: grow the
   prototype in place — cheaper start, but it predates the module boundaries and would drag its structure
   in. Confirm freeze-and-harvest?
2. **Package manager / workspace tool.** npm workspaces assumed (matches Regen and keeps EAS friction
   zero). Fine, or do you want pnpm/bun?
3. **Ledger history depth.** Analysis needs per-day summaries (heat map, monthly Time Reclaimed). Draft
   says: keep day-summary records indefinitely in AsyncStorage (a year ≈ a few hundred KB). OK, or cap
   and archive?
4. **Where the Maestro loop runs.** Locally on the Mac as the primary loop (agents drive it), with CI
   running unit/guardrail suites only — or do you want macOS CI runners doing Maestro too (slow, flaky,
   costs)? Draft assumes local-loop + unit-CI.
5. **Fixture selection mechanism for e2e.** Draft: launch environment/config per Maestro flow picks the
   fixture manifest (debug-menu taps as fallback). Any objection?
6. **Vendor evaluation locus for the webhook upgrade.** v1 is clean (raw payloads transit the server,
   evaluation on-device). PRD §10.1 hints webhook-driven earns could be server-evaluated later — that
   would breach "server never computes earning" unless webhooks merely *notify* and the device still
   evaluates on next wake/open. Draft scaffolds webhooks as notify-only; flagging that the eventual
   upgrade needs its own decision.
7. **TestFlight debug menu.** PRD says dev/TestFlight only — draft compiles it out of App Store builds via
   EAS profile flag, present everywhere else. Confirm that's the intended line.
8. **Exercise-minutes catalog entry** (#17 G2). Draft encodes it as Watch-gated in the catalog model
   (hidden unless an `appleExerciseTime` source exists) with copy steering to workout-minutes. Alternative
   is redefining the entry to workout-duration for everyone. Which way?
