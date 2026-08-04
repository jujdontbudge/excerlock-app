# Scenario-fixture schema — how e2e flows get deterministic app state

> **Ticket #15 · DRAFT for Johan's reaction.** Companion to `e2e/HARNESS.md`.
> Sources: `ARCHITECTURE.md` §4 (the fixture/timeline pattern — this schema
> implements it verbatim), §2 SignalKit (the five providers), D5 (debug menu =
> composition-root switchboard); `docs/research/e2e-loop.md` §mock-state-injection
> (deep link primary, control server secondary, launch args last-resort).
>
> Ownership: the timeline row format and provider fixtures belong to the
> **SignalKit design** — this doc is the e2e-side contract and must stay in
> lockstep with `app/src/signals/*` when it exists.

---

## 1. Two layers: fixtures vs scenarios

**A fixture** is a named, versioned timeline owned by one provider module —
a data file in that module's `fixtures/` dir
(`app/src/signals/<provider>/fixtures/<name>.json`). It tells one signal's
story (`red-light`, not `fixture2`). Unit tests replay it on fake timers; e2e
replays it on the app's virtual clock.

**A scenario** is an e2e-owned composition: one fixture per provider + the
pinned clock + preloaded app state (ledger, conditions, onboarding,
entitlement, vendor connections, armed monitors). Scenario manifests live in
`e2e/scenarios/<name>.json` and are **bundled into the e2e build** at build
time, so a release-style build can load them with no Metro and no network.
Flows reference scenarios by name only; each flow header documents its
scenario (one scenario per flow file).

```
fixture  = one provider's timeline          app/src/signals/<provider>/fixtures/
scenario = fixtures × clock × app state     e2e/scenarios/
flow     = one scenario × one user journey  e2e/flows/
```

## 2. The timeline row

The universal unit, shared with every unit-test suite (ARCHITECTURE §4):

```jsonc
{ "atMs": 120000, "event": "screentime.tick", "payload": { "thresholdIndex": 2 } }
```

- **`atMs`** — offset from the scenario's `clock.now` (t0). Rows are sorted
  ascending. `atMs <= 0` rows are **history**: applied synchronously during
  scenario load (e.g. this morning's HK samples, ticks already spent).
  `atMs > 0` rows are **future**: they fire when the virtual clock reaches them.
- **`event`** — namespaced `<provider>.<eventName>` (vocabulary in §3).
- **`payload`** — event-specific, JSON only. Shapes are owned by the provider
  interfaces; fixtures never invent fields the `Fixture<Signal>Provider`
  doesn't consume.

Virtual-clock playback modes (per scenario, `clock.playback`):

- **`"manual"` (default for e2e):** future rows fire only when the control
  server advances the clock (`POST /e2e/clock`). Fully deterministic under
  Maestro — a flow step advances time, then asserts.
- **`"auto"`:** future rows fire on accelerated real time at
  `clock.speed` × (e.g. `60` = one virtual minute per real second). For
  ambient-drain demos and the debug menu; flows that assert exact states
  should prefer `manual`.

## 3. Event vocabulary (per SignalKit provider)

Grows with the provider interfaces; this is the v1 starter set. Every name an
e2e manifest uses MUST exist in this table (or its successor in the SignalKit
READMEs) — unknown events are a scenario-load error, never silently ignored.

| Provider | Event | Payload sketch |
|---|---|---|
| `health` | `health.samplesAdded` | `{ signal, samples: [{ value, startISO, endISO, sourceRevision, wasUserEntered }] }` |
| | `health.backgroundWake` | `{ signal }` — invokes the background-delivery handler directly (sim can't produce real wakes) |
| | `health.authChanged` | `{ status }` |
| `motion` | `motion.activityChange` | `{ activity: walking\|stationary\|automotive, confidence }` |
| | `motion.pedometerUpdate` | `{ steps, cadence }` |
| | `motion.authDenied` | `{}` |
| `location` | `location.enterRegion` / `location.exitRegion` | `{ regionId }` |
| | `location.update` | `{ lat, lon, accuracy }` |
| | `location.authChanged` | `{ status }` |
| `screentime` | `screentime.tick` | `{ thresholdIndex }` — one 1-min drain-ladder event |
| | `screentime.monitorFired` | `{ monitor: dayBoundary\|walkSessionEnd\|… }` |
| | `screentime.intervalEnded` | `{ monitor }` |
| | `screentime.authChanged` | `{ status }` |
| `vendor` | `vendor.activityAvailable` | `{ vendor: strava\|oura\|whoop\|polar, raw: <recorded JSON> }` |
| | `vendor.connectionChanged` | `{ vendor, state }` |
| | `vendor.rateLimited` | `{ vendor, retryAfterS }` |

## 4. Scenario manifest schema

```jsonc
// e2e/scenarios/steps-earned-5k.json
{
  "name": "steps-earned-5k",            // MUST match filename; kebab-case, story-named
  "version": 1,                          // bump on any breaking edit; flows pin by name, not version
  "description": "Fresh day, one 5k-steps event condition, walk history that crosses it mid-flow.",

  "clock": {
    "now": "2026-07-28T09:41:00-04:00", // t0 — the mock boundary owns "now" (determinism pin)
    "playback": "manual",               // "manual" | "auto"
    "speed": 60                          // used only when playback = "auto"
  },

  "state": {
    "onboarding": "complete",           // "complete" | "fresh"
    "entitlement": "free",              // "free" | "premium"  (input to the Adapty adapter, not a gate branch)
    "ledger": {
      "baseAllowanceMinutes": 45,
      "journal": []                      // append-only day-journal entries, keyed (source, id) — replay-idempotent
    },
    "conditions": [
      { "kind": "event", "signal": "steps", "source": "health", "threshold": 5000,
        "reward": { "type": "fixedChunk", "minutes": 20 } }
    ],
    "shield": { "armedMonitors": [],     // monitors "already armed" at load
      "screenTimeModule": "mock" },      // OPTIONAL "mock" (default) | "native".
                                         // Which ScreenTimeModule the scenario composes.
                                         // Absent/"mock" = MockScreenTimeModule on the scenario
                                         // clock — deterministic canned selection and drivable
                                         // shield state, what every flow before #97 assumes.
                                         // "native" keeps the real FamilyControls adapter; on a
                                         // fresh iOS 26.4.1 simulator real authorization
                                         // completes silently (measured 2026-08-04), so only
                                         // the screentime-permission flow uses it.
    "vendors": { "strava": "disconnected", "oura": "disconnected",
                 "whoop": "disconnected", "polar": "disconnected" }
  },

  "providers": {                         // one fixture name per provider, resolved from the
    "health":     { "fixture": "day-steps-approaching-5k" },   // module's fixtures/ dir
    "motion":     { "fixture": "steady-walk" },
    "location":   { "fixture": "quiet" },
    "screentime": { "fixture": "tick-ladder-basic" },
    "vendor":     { "fixture": "none-connected" }
  },

  "timeline": []                         // OPTIONAL scenario-local extra rows, merged (by atMs)
                                         // over the provider fixtures — for one-off cross-provider
                                         // stories that don't deserve a named fixture
}
```

Load semantics: reset all stores → set clock → apply `state` → mount fixture
providers → apply history rows (`atMs <= 0`) in order → re-render. Loading is
idempotent: loading the same scenario twice yields identical app state
(journal keying makes replay safe).

**Unknown scenario name or invalid manifest → the app renders a dedicated
error screen (`testID: screen-e2e-error`, message includes the name and the
validation error)** so Maestro fails fast with a readable assert instead of
timing out on the home screen.

## 5. Canonical fixtures (per provider — ship with each provider's first test file)

From ARCHITECTURE §4; names are law once shipped:

- **motion (the #21 seven):** `steady-walk` · `red-light` · `stop-for-good` ·
  `drive-off` · `shaky-cheat` · `late-classification` · `denied-permission`
- **health:** `day-mixed-sources` (mixed `sourceRevision`s for dedup) ·
  `manual-entry-day` (`wasUserEntered` filtering) · `background-wake-replay` ·
  `day-steps-approaching-5k`
- **screentime:** `tick-ladder-basic` · `tick-ladder-jitter` · `re-arm-race`
- **location:** `gym-enter-exit` · `region-blip` · `quiet`
- **vendor (recorded real JSON, scrubbed):** `strava-morning-run` ·
  `strava-manual-entry` · `strava-trainer-ride` · `whoop-pending-score` ·
  `polar-unflagged-manual` · `oura-daily-activity` · `none-connected`

## 6. Canonical scenarios (v1 starter catalog)

Grows one scenario per flow; the catalog below seeds the suite. Every name in
this table gets a manifest in `e2e/scenarios/` before its flow lands.

| Scenario | Story | Load-bearing fixtures |
|---|---|---|
| `baseline-fresh-install` | Clean install, onboarding complete, default allowance, nothing connected (used by `smoke-home.yaml`) | all `quiet`/`none` |
| `steps-earned-5k` | Event condition crosses 5k mid-flow → earn fires → shield lifts | health `day-steps-approaching-5k` |
| `balance-drain` | Mid-session drain: ticks eat the balance, display counts down, shield returns at zero | screentime `tick-ladder-basic` |
| `walk-and-scroll-happy` | Walk session: verified walking sustains unlocked scrolling | motion `steady-walk` |
| `walk-and-scroll-cheat` | Phone-shake cheat detected → session ends | motion `shaky-cheat` |
| `gym-checkin` | Geofence enter/exit drives a place condition | location `gym-enter-exit` |
| `vendor-strava-run` | Connected Strava run lands → dedup vs HealthKit → single earn | vendor `strava-morning-run`, health `day-mixed-sources` |
| `day-boundary-rollover` | Clock just before boundary; boundary fires; allowance resets + rollover cap | screentime `monitorFired: dayBoundary` |
| `full-lock` | Allowance 0 — the degenerate everything-shielded day | — |
| `paywall-free-tier` | Free entitlement hits a premium-gated surface | — |

## 7. Selection: the deep link

```
excerlock://e2e/scenario/<name>[?overrides=<url-encoded JSON>]
```

- Registered **only** in E2E/dev builds (`EXPO_PUBLIC_E2E=1`); the path is a
  no-op in App Store builds.
- `<name>` resolves against the bundled `e2e/scenarios/` set.
- `overrides` is a JSON **merge-patch applied onto the manifest** before load
  (e.g. `{"state":{"entitlement":"premium"}}` reuses a scenario across the
  free/premium axis instead of duplicating it). Abuse guard: if a flow needs
  more than a couple of leaf overrides, it wants its own scenario.
- Works cold-launch on the release-style e2e build. Maestro usage (with the
  one-time iOS confirm guard) is templated in `flows/smoke-home.yaml`.
- Same channel powers the **debug menu's** fixture switchboard (ARCHITECTURE
  D5) and manual poking: `xcrun simctl openurl "$E2E_UDID" "excerlock://e2e/scenario/<name>"`.

Launch-argument selection is the documented **last-resort only** (strings
only, booleans broken — Maestro #2113): `scenario: "<name>"` via `launchApp`
`arguments:`, honored if the deep-link handler is ever broken.

## 8. The in-app control server (mid-flow events)

E2E builds run a localhost HTTP listener — **port 8085, loopback only, JSON
only, compiled out of App Store builds**. It exists for what deep links can't
do: injecting events *during* a flow at exactly the entry points the mock
boundary owns (sim can't produce background wakes; we invoke the handler
directly).

| Endpoint | Body | Effect / response |
|---|---|---|
| `GET /e2e/health` | — | `200 {"ok":true,"scenario":"<name>"}` — readiness probe for flows |
| `POST /e2e/scenario` | `{"name","overrides"?}` | Load a scenario (same semantics as the deep link) |
| `POST /e2e/signal` | `{"event","payload"?}` | Fire one timeline-row-shaped event **now** (event vocabulary §3) |
| `POST /e2e/clock` | `{"advanceMs"}` or `{"now":"<ISO>"}` | Move the virtual clock forward, firing every timeline row crossed, in order. Moving backward is a `400` |
| `GET /e2e/state` | — | Debug snapshot: `{scenario, clockNow, ledger:{remainingMinutes,…}, shield:{desired}, providers:{<name>:<fixture>}}` — for the agent's diagnosis, **never** for flow assertions (assert on UI, not internals) |

Errors: `400 {"error":"<message>"}` (unknown event, malformed payload,
backward clock); `404` unknown scenario. Every mutating endpoint responds only
**after** the event has been fully applied and React state flushed, so a flow
can assert immediately on return.

Maestro usage:

```yaml
- runScript:
    script: |
      const r = http.post('http://localhost:8085/e2e/signal', {
        body: JSON.stringify({ event: 'screentime.tick', payload: { thresholdIndex: 3 } }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!r.ok) throw new Error('e2e signal failed: ' + r.body);
- assertVisible: { id: balance-remaining-16 }   # example: tick landed, UI reflects it
```

## 9. Open questions for Johan

1. **Port 8085** — fine, or reserve a different one? (Anything stable and
   unused on the sim's loopback works; it lands in one constant.)
2. **`overrides` merge-patch** — keep it, or forbid overrides entirely and
   force every variant to be a named scenario? (Draft keeps it, guarded by the
   "more than a couple of leaves → new scenario" rule.)
3. **Scenario manifests bundled vs fetched** — draft bundles them into the e2e
   build (release build, no Metro). Cost: manifest edits require a JS rebuild.
   Acceptable, or should the e2e build read them from the control server's
   filesystem sibling at load? (Draft says bundle — simpler, and manifest
   edits are rare once the catalog stabilizes.)
