# e2e-next — the simulator end-to-end program (plan §7, Phase D)

Headless, release-style simulator runs of `app-next` against the **live preview
services** (Supabase / Adapty / PostHog / API), each ending in a machine-readable
verdict and a PostHog assertion scoped to the run's own `$device_id`.

**Maestro is banned machine-wide** (`e2e/README.md`; the archival `e2e/` YAML suite
targets the retired `app/` tree). This harness drives the pinned simulator through
`xcrun simctl` + `idb` exactly like the existing `app-next/scripts/accept-*.py` /
`capture-*.py` scripts, reusing `app-next/scripts/sim.py` for taps, gestures,
screenshots and recording.

## Layout

```
app-next/e2e-next/
  run.py                 runner: run.py <scenario>... | --all | --list
  harness.py             simulator ownership, fixtures, verdict contract, UI/state primitives
  build.py               release-style preview build (expo prebuild + pod install + xcodebuild Release)
  posthog.py             HogQL against project 537075, polled ≤60 s, scoped to the run's $device_id
  supabase.py            admin API: email OTP/session minting, user lookup (email sign-in + deletion lanes)
  adapty.py              Adapty server-side API: grant/revoke the `premium` access level on a profile
  fixture.py             existing-user fixture metadata + grant liveness (E2E-F1 captures, E2E-F2 tears down)
  scenarios/             one module per scenario, registered in scenarios/__init__.py
  out/<run>/             evidence: <scenario>/{verdict.json,screenshots,recording.mp4,harness.log}
  build/                 derived data + build log (git-ignored)
  fixtures/              captured app-container snapshots (git-ignored)
```

## Commands

```bash
# one-time (or after JS/native changes): release-style preview build + install
python3 app-next/e2e-next/build.py --udid "$EXCERLOCK_SIM_UDID"

# run scenarios (builds only when no usable artifact exists)
python3 app-next/e2e-next/run.py E2E-N1 E2E-V1
python3 app-next/e2e-next/run.py --all --run-id 20260916T2300Z
python3 app-next/e2e-next/run.py --list

# mint the existing-user fixture (Adapty server-side grant, not a purchase),
# consume it in the same invocation while the keychain session is live, and
# tear it down at the end (E2E-F2 revokes the grant, deletes the identity and
# removes the snapshot; it also accepts an identity E2E-A4's UI half consumed)
python3 app-next/e2e-next/run.py E2E-F1 E2E-E1 E2E-V1 E2E-F2 --run-id 20260917T2022Z
python3 app-next/e2e-next/run.py E2E-F1 E2E-A4 E2E-F2 --run-id 20260917T2048Z
python3 app-next/e2e-next/run.py E2E-F1 E2E-R1 E2E-F2 --run-id 20260918T2059Z
python3 app-next/e2e-next/run.py E2E-F1 E2E-H1 E2E-F2

# E2E-V1 owns both sweep states (guarded first, then the fresh install that
# resets the keychain) and E2E-A4's confirmation consumes the identity, so each
# consumer gets its own E2E-F1 mint.

# snapshot/patch the installed app container manually (E2E-F1 automates this)
python3 app-next/e2e-next/run.py --capture-fixture existing-user
```

`EXCERLOCK_SIM_UDID` is authoritative; without it the runner resolves the pinned
`ExcerLock-Next` device and refuses to guess anything else (no default device is
safe). The runner boots the device, pins appearance/status bar, and starts an
`idb_companion` for the device if none is listening, exporting `IDB_COMPANION` for
every child process.

Credentials are never committed. `harness.env_value` resolves, in order:
process environment → `~/.excerlock/env` → `~/.excerlock/<VAR_NAME>` (the §10.10
dotfile convention documented in `scripts/check-env.ts`). The harness needs:

| Variable | Used by |
|---|---|
| `POSTHOG_PERSONAL_API_KEY` | `posthog.py` HogQL queries (`~/.excerlock/POSTHOG_PERSONAL_API_KEY`) |
| `POSTHOG_PROJECT_ID` (default 537075), `POSTHOG_API_HOST` (default `https://us.posthog.com`) | PostHog queries |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `supabase.py` admin OTP/session/user operations |
| `ADAPTY_SECRET_KEY` | `adapty.py` server-side grant/revoke (`~/.excerlock/ADAPTY_SECRET_KEY`; Adapty → App settings → General → API keys → Secret key) |
| `EXPO_PUBLIC_*` + aliases (`~/.excerlock/env`) | `build.py` preview build |

## One build, one simulator (harness rule)

The harness builds the app **once** and runs **every** scenario in the invocation
against that one artifact on the one owned simulator:

* `build.py` caches the artifact by the **app-source revision**
  (`appSourceRevision`, a hash of `git ls-tree -r HEAD -- app-next` excluding the
  harness itself) and records it in `build/build.json` next to the full `revision`.
* `run.py` takes many scenarios in one invocation (`run.py E2E-N1 E2E-V1 ...` or
  `--all`), resolves the build once, boots the pinned `EXCERLOCK_SIM_UDID` once,
  and hands the same build manifest to every scenario. It rebuilds only when the
  cached artifact's `appSourceRevision` no longer matches the tree — never per
  scenario. `--no-build` reuses the artifact and warns when it is stale.
* The fresh-install fixture reinstalls the **app** (`simctl uninstall` +
  `keychain reset` + `privacy reset` + `simctl install`) on that same booted
  device; no scenario boots, erases or creates a simulator.

## Build under test

`build.py` produces a **Release** simulator build of `app-next` with
`EXCERLOCK_ENV=preview`: real services, preview OTA channel, embedded JS bundle,
arm64 only. It mirrors the local-native-build rules from `storekit/README.md`:
`SENTRY_AUTH_TOKEN` is dropped and `SENTRY_DISABLE_AUTO_UPLOAD=true` is set before
`expo prebuild`, `pod install` and `xcodebuild`. The same environment is passed to
both prebuild and xcodebuild so the native `Expo.plist` channel and the embedded
bundle agree.

The build manifest (`build/build.json`) and the capability map (below) are copied
into every `verdict.json`, so a verdict is always traceable to one artifact.

## Verdict contract (fail closed)

One `verdict.json` per scenario under `out/<run>/<scenario>/`:

```json
{
  "scenario": "E2E-N1", "status": "PASS|FAIL|BLOCKED", "reason": "...",
  "device": {...}, "build": {...}, "capabilities": {...}, "fixture": {...},
  "identity": {"posthogDeviceId": "...", "supabaseUserId": "..."},
  "assertions": [{"id": "...", "status": "...", "detail": "...", "blockedUntil": "B4a"}],
  "artifacts": {"screenshots": [...], "trees": [...], "recordings": [...]},
  "posthog": [{"query": "...", "rows": 12, "waitedSeconds": 4.2, "events": [...]}]
}
```

* **PASS** — every assertion passed.
* **FAIL** — the app or the service did the wrong thing (the scenario *could* run).
* **BLOCKED** — the scenario could not reach its precondition (missing fixture,
  unlanded sibling feature, unavailable service). Never SKIP-as-pass; the reason
  and, where applicable, `blockedUntil` name the exact blocker.
* Scenario status = worst assertion status. Exit codes: `0` all PASS, `1` any FAIL,
  `2` any BLOCKED.

### BLOCKED-until naming

`harness.detect_capabilities()` inspects the worktree sources at run time and
records which plan contracts are present. Assertions that need a sibling's
contract call `ctx.gate(capability, ...)` and report **BLOCKED-until-`<sibling>`**
with the inspected contract text instead of a bare failure. Current map (plan §0):

| Key | Contract | Owner |
|---|---|---|
| `B1.remote_config_copy` | `remoteCopy` reads `flow.remoteConfigs[0].data` | remote paywall copy |
| `B2.paywall_error_reporting` | client emits `paywall_error {operation}` | paywall error UX |
| `B3.fallback_paywall` | `assets/adapty-fallback.json` + `sdk.setFallback` | offline paywall |
| `B4a.screen_step_mapping` | `semanticScreenName` maps onboarding/setup step ids | analytics coverage |
| `B4b.root_screen_tracking` | root `usePathname()` subscriber emits `screen()` | analytics coverage |
| `B6.paywall_funnel_events` | client emits `paywall_viewed` / `purchase_started` | typed events |
| `B7.signin_required_flag` | `SignInScreen` mounts receive a flag-backed source | flag consumers |
| `B10.startup_marks` | five os_signpost startup stages | startup marks |
| `A5.sentry_before_boot` | Sentry initialised ahead of the boot gate | Sentry |

## Scenario catalog (SIM lane)

| ID | Fixture | What it drives | Assertions | State in this worktree |
|---|---|---|---|---|
| `E2E-N1` | fresh install | real onboarding O01→P, paywall | full walk observed step by step; paywall renders; live products; CTA; `$screen` per step; `paywall_viewed`; startup first-frame budget | walk, live products, CTA, `paywall_viewed` and `$screen` PASS; **O01 emits no `$screen` row** (the one app gap); startup budget BLOCKED (device lane) |
| `E2E-F1` | fresh install | mints the existing-user fixture: pre-created identity → server-side `premium` grant → real email sign-in → setup X4→X5 → capture | identity exists; grant active; sign-in completes; the app observes the grant (lands on setup X4) and completes setup; snapshot + metadata + persisted-key reads | **PASS** (`20260917T2022Z`, `20260917T2048Z`) |
| `E2E-N4` | fresh install | the plan's literal shape: every Adapty endpoint denied from the very first launch (`/etc/hosts` → `0.0.0.0`), onboarding O01→P | endpoints verified unreachable; the offline walk reaches the paywall; the fallback render is **BLOCKED-until `offline-first-launch-identity`** (AdaptySDK-iOS 4.0.2 cannot identify without the backend, see findings); denial still holds after the walk; `/etc/hosts` restored byte-for-byte | denial, boot, walk and restore PASS; render BLOCKED-until `offline-first-launch-identity` (follow-up 5, `20260917T1936Z`) |
| `E2E-N4W` | fresh install | one online launch creates the Adapty profile (never opening the paywall), then a launch with every Adapty endpoint denied (`/etc/hosts` → `0.0.0.0`), onboarding O01→P | Adapty profile existed and no placement was cached before the offline launch; endpoints verified unreachable; offline walk reaches the paywall; the export's remote-config title and its annual+monthly Premium A plans render; denial still holds after the walk; `/etc/hosts` restored byte-for-byte | **PASS** (`20260917T1936Z`): title + both Premium A plans render offline |
| `E2E-E1` | existing user | relaunch, no paywall, Home | boot destination; `$screen home`; interactive-Home budget | the fixture relaunches to Home with no paywall and **PASSES** boot/`$screen home` (`20260917T2001Z`); `startup.home_budget` stayed BLOCKED-until B10 on that run (its harness still used the pre-merge `--signposts` flag); the merged harness reads the simulator signpost stream, so a re-run records the delegate-relative number — the §6.2 budget itself stays on the device lane (ADR 0021/0033) |
| `E2E-V1` | existing user + fresh install | every production route (guarded sweep + onboarding/deep links) | one `$screen` row per visited route; route-coverage table | **PASS** (`20260917T2022Z`): the guarded phase runs on the E2E-F1 fixture (19 label-judged visits render behind the guard, `/setup/X4` stays closed, the entitled paywall is proven by its `$screen` row), then the 29-step fresh sweep and the fresh guards |
| `E2E-S1` | fresh install | 10 cold launches, launch timing | medians vs §6.2 (first frame ≤1.5 s, interactive Home ≤2.5 s) | coarse launch→surface measured **and** the app's delegate-relative stage medians recorded from the simulator's own unified log (`measure-startup.sh --sim-log`); the device lane records the same stages through a real xctrace device capture (`evidence/T15/device-startup-stage-medians/`, finding 3); §6.2 budgets BLOCKED-until the device lane (ADR 0021/0033); the fixture side is solved by E2E-F1/E1, so the Home budget only needs the device/signpost readout; `xctrace`-on-simulator recording is broken on this host (finding 3) |
| `E2E-A3` | fresh install | welcome footer → email sign-in | signed-in UI; Supabase user; `PUT /v1/user` 204; PostHog rows under the canonical distinct id; teardown 204/410/404 | **PASS** (recovery lane, admin-minted code — see findings) |
| — | — | `E2E-POSTHOG-TIMEOUT` env | `E2E_POSTHOG_TIMEOUT` (screen window, default 60 s) and `E2E_PAYWALL_WAIT` (extended poll for load-driven events, default 300 s) tune the PostHog windows | — |
| `E2E-A4` | existing user | Settings → Account → delete | 204, re-PUT 410, Supabase 404, PostHog person erased, local wipe | harness-driven API half **PASS** (204 → re-`PUT` 410 → Supabase 404 → PostHog person erased); the UI half runs on the E2E-F1 fixture and records **FAIL**: the server accepts the delete (204 at the confirm tap) but the app's local cleanup stays pending on the simulator (Family Controls/CoreMotion absent), so the sheet keeps its retry note instead of returning to onboarding (follow-up 3) |
| `E2E-R1` | existing user | Settings → "Something not working?": empty Send press, one-answer press, both answers + Send | Send is enabled with both answers empty; an empty press shows "Answer both questions, then tap Send."; one answer names the missing one; both answers reach the thanks screen (or a visible error — silence fails) | **PASS** (`20260918T2059Z`): all seven assertions, real report accepted by the API |
| `E2E-H1` | existing user | Home: hold the Walking chip, tap Report, tap Send | chips and Report are on Home without opening anything; the sheet's one line names the preselected reason and "Walking"; Send → thanks card; the newest `incident_reports` row for the fixture user (read over the deploy SSH path, `sudo -u postgres psql`) holds `<reason> while walking` and `diagnostics.activityTruth.activity = walking` | **PASS** (`20260919T022047Z`, `20260919T032354Z`): all seven assertions |
| `E2E-F2` | — | fixture teardown: revoke the grant, delete the identity, remove the snapshot | revoke 2xx + inactive readback; Supabase delete + 404 readback; files removed | **PASS** (`20260917T2022Z`); also accepts a 404 when E2E-A4's UI half already consumed the identity (`20260917T2048Z`) |
| `E2E-E2` | — | OTA receipt, binary unchanged | **documented stub** (publishes a preview EAS Update; §8.10 keeps release-lock ops out of E2E automation) | BLOCKED by design |

Not in scope here: `E2E-N3` purchase UI (standing instruction: no StoreKit UI
re-runs; purchase assertions stop at the CTA, §8.1) and the SBX lane
(`E2E-P1/P2/X1`), which owns sandbox receipt truth on hardware.

## Proven runs (committed evidence)

Evidence is committed under `out/<run>/` (recordings stay local: a full onboarding
video is >100 MB and regenerates with any run; screenshots are committed at
480 px). Every verdict carries the build manifest — including the **git revision**
and whether the tree was dirty — the capability map, the assertion list and the
PostHog query trace.

| Run | Revision | Scenario | Verdict | Result |
|---|---|---|---|---|
| `20260919T032354Z` | `209775cf` | `E2E-F1`, `E2E-H1`, `E2E-F2` | **PASS** | The walking-gate change (ADR 0041: raw-stream corroboration of Apple's legs, the confirmed stop, grace re-verification) on a release build: the fixture mints, Home renders with the new `DetectionService`/`MotionAdapter` in the runtime, the Home Report flow lands its row. Core Motion does not run on the simulator, so the gate itself is proven by the capture replay in ADR 0041 and the unit suites, not here |
| `20260919T022047Z` | `69189473` (+ scenario reason fix) | `E2E-F1`, `E2E-H1`, `E2E-F2` | **PASS** | **H1**: hold Walking → Report → Send on Home; report row persisted with `activityTruth.activity = walking`. Two earlier runs the same evening caught what Jest could not: `20260919T020916Z` — the release build died on the first chip tap (bare `activityTruthStore((s) => …)` under the React Compiler, "Should have a queue"; fixed by the `use` alias plus the `storeHookNaming` guardrail), and `20260919T021935Z` — the scenario assumed the fixture sits in the `locked` decision; on the simulator it does not, so the scenario now follows the reason the sheet shows |
| `20260918T2059Z` | `6070b10d` (+ build 5 bump; build `appSourceRevision` 09e9ac8a3dfe) | `E2E-F1`, `E2E-R1`, `E2E-F2` | **PASS** | **R1**: the Report screen on the fixture — Send enabled while empty, empty press → "Answer both questions, then tap Send.", one answer → "Tell us what should have happened, then tap Send.", both answers → real `POST /v1/incident-reports` accepted and the thanks screen. Harness fix in the same change: `tap_field`/`text_field` target the field node, not its same-labelled caption, and match a multiline TextArea whose label carries its placeholder (the `20260918T2043Z` mint typed into nothing) |
| `20260917T2022Z` | `f10c245c` (build `appSourceRevision` `19bfb23d6dbf`) | `E2E-F1`, `E2E-V1`, `E2E-F2` | **PASS** | **F1**: disposable identity, real Adapty server-side `premium` grant, email sign-in, X4→X5, snapshot + persisted keys. **V1**: guarded phase on the fixture (`guarded.boot_home`, every fixture route's `$screen` row, 51/72 label-judged visits exactly as their state allows, 19 behind the setup-complete guard, `/setup/X4` correctly closed), then the 29-step fresh sweep; ~306 s of the run was the PostHog guarded-screen wait. **F2**: revoke 200 + inactive readback, Supabase delete + 404, files removed |
| `20260917T2001Z` | same build | `E2E-E1` | PASS assertions / BLOCKED budget | the fixture relaunches to Home with no paywall and emits `$screen home` (plus the mint's `onboarding`/`setup` rows under the same `$device_id`); only `startup.home_budget` is BLOCKED-until B10, and that run's harness still read the log with the pre-merge `--signposts` flag |
| `20260917T2048Z` | same build | `E2E-A4`, `E2E-S1` | **FAIL** (UI delete) / BLOCKED (device lane) | **A4**: `ui.delete_flow` FAIL — the app stays on the confirmation sheet with its retry note; the server side is fully green (`PUT` 204, `DELETE` 204 at the confirm tap, re-`PUT` 410, Supabase 404, PostHog person erased), and F2's admin delete later found the identity still present because the durable erasure is asynchronous. **S1**: 10 cold launches measured, §6.2 budgets BLOCKED on the device/signpost lane |
| `20260917T1948Z`–`T2040Z` | same build | intermediate | superseded | the mint attempts that drove the harness fixes below (lossy `idb ui text`, stale route markers, the `$screen` race); their verdicts stay under `out/` as evidence of the diagnosis |
| `20260917T1936Z` | `61a42d2c` | `E2E-N4W` | **PASS** | **The offline-render proof for B3.** One online launch created and identified the Adapty profile (`a57ebe11-…`) without ever opening the paywall and cached no placement; every default-cluster Adapty endpoint was then denied (`/etc/hosts` → `0.0.0.0`, resolver + curl exit 7 verified before and after) and a 29-screen offline cold launch walked real onboarding to P; the paywall rendered the export's remote-config title `Unlock ExcerLock Premium` and both Premium A plans (Premium Annual/Monthly, $59.99; load-error state empty); `/etc/hosts` restored byte-for-byte |
| `20260917T1936Z` | `61a42d2c` | `E2E-N4` | BLOCKED | PASS: the denial holds before and after the walk, the release build boots with Adapty unreachable, the 29-screen walk reaches the paywall, `/etc/hosts` restored byte-for-byte. BLOCKED-until `offline-first-launch-identity`: AdaptySDK-iOS 4.0.2 creates the profile on the server at activation and `identify` awaits it, so on a fresh install the identity spine never commits and `loadPaywall`'s expected-identity gate never opens (follow-up 5) |
| `20260917T1600Z` | `3cb66c1f` | `E2E-N1` | **FAIL** (one real gap) + BLOCKED budget | PASS: fresh install boots real onboarding; all 29 screens walked in flow order; paywall renders the two live placement plans (Premium Annual/Monthly, $59.99) matching the Adapty `onboarding` placement; CTA; run-scoped `$device_id`; `paywall_viewed {placement: onboarding}`; `$screen paywall`; 35 ingested rows in 2 s. **FAIL**: 27/28 visited steps have a `$screen` row — **O01 emits none**. BLOCKED: §6.2 startup budget (device measurement, ADR 0021/0033) |
| `20260917T1600Z` | `3cb66c1f` | `E2E-V1` | BLOCKED | PASS: 29-screen onboarding sweep, `$screen` step rows for every step (incl. `O13`), `$screen paywall`, run-scoped `$device_id`, ingestion. BLOCKED: 20 of 51 route visits sit behind the setup-complete/entitled guards (existing-user fixture) |
| `20260917T0650Z` | pre-overhaul build (2026-09-17T10:40Z, revision not recorded) | `E2E-A3` | **PASS** | sign-in sheet → email → admin-minted code → sheet closes → re-opened sheet shows the signed-in account; Supabase user not anonymous; `PUT /v1/user` 204; app persisted the canonical UID as its PostHog distinct id; `$identify` row under that UID; teardown 204/410/404 |
| `20260917T0640Z` | pre-overhaul build (2026-09-17T10:39Z) | `E2E-S1` | BLOCKED | PASS: 10 cold launches measured (launch call ~0.2 s; launch → first interactive surface 3.8–7 s through idb polling). BLOCKED: the xctrace stage export, the §6.2 budget gate (device lane) and the Home budget (fixture) |
| `20260917T1810Z` | `32ce84a0` (tree dirty in the harness and `app-next/scripts/` only — this change; `appSourceRevision` `357920f28447` is main's app sources) | `E2E-S1` | BLOCKED | PASS: 10/10 cold launches reached an interactive surface (median 3.95 s launch → first surface, idb-polled). PASS **the stage medians**: every launch reported all four fresh-install B10 stages — median step/cumulative `FirstReactRender` 41.649 ms, `HydrationDone` +0.471 → 42.103 ms, `RuntimeReady` +2.04 → 44.005 ms, `BootGateRedirect` +0.027 → 44.031 ms — read from the simulator unified log through `measure-startup.sh --sim-log` (raw capture, parser output and diagnostic committed under `out/20260917T1810Z/E2E-S1/startup-sim-log/`). BLOCKED: the §6.2 budget gate (device lane); the Home budget's fixture side is now solved by E2E-F1 |
| `20260917T0640Z` | pre-overhaul build | `E2E-E1`, `E2E-A4` | BLOCKED | no existing-user fixture existed at that time (mint with E2E-F1 since) |
| `20260917T0640Z` | pre-overhaul build | `E2E-E2` | BLOCKED | by design: publishes a preview-channel EAS Update (documented stub) |

The A3/E1/A4/E2 evidence predates the UI-overhaul commits that landed after
those runs; their verdicts still record the build's `builtAt`/artifact path, and
the harness re-runs them unchanged against any newer build. `E2E-S1` was re-run
afterwards (`20260917T1810Z`) and its stage-median evidence is current.

The device lane has its own stage-median capture (no scenario verdict, so it is
not a table row): `20260917T2015Z` recorded 20 cold launches of a
manual-signed preview Release on `Il` and 11 carried all four fresh-install B10
stages — device cumulative medians `FirstReactRender` 200.485 ms,
`HydrationDone` 212.256 ms, `RuntimeReady` 268.051 ms, `BootGateRedirect`
269.404 ms, parsed from a real xctrace export by the same
`measure-startup.sh`/`startup-stage-medians.cjs` pair (evidence and recipe under
`app-next/evidence/T15/device-startup-stage-medians/`). They are
delegate-relative diagnostics: the §6.2 budgets stay with a signed distribution
build (ADR 0021/0033).

The N1/V1 evidence in `20260917T1600Z` was captured on the build made from
`appSourceRevision` of that moment. Later commits on `main` touch app sources
(detection work), so the next `run.py` invocation reports the cache as stale,
rebuilds once, and re-runs every selected scenario against the new artifact — no
scenario rebuilds anything on its own.

### The one app finding N1 proves

`$screen` rows cover every visited onboarding step **except O01**: the first
screen of onboarding reports nothing to PostHog. The analytics gate requires a
ready canonical identity (`allowed()` in `PostHogAnalyticsAdapter`), and on a
fresh install the identity spine has not settled when O01 paints, so the event is
dropped rather than queued. Every later step reports. Reproduce with
`E2E-N1` and inspect `analytics.step_screen_events` in its `verdict.json`
(`required` = observed steps minus the paywall, whose row arrives with ingestion
lag).

## Follow-ups this program opens (not fixed here)

1. **O01 emits no `$screen` row.** The first onboarding screen is invisible to
   analytics because the adapter's gate requires a ready canonical identity and
   O01 paints before the spine settles; the event is dropped, not queued. Fix
   belongs with the analytics-coverage work (queue until identity is ready, or
   emit with the anonymous identity and let `$identify` join it). Reproduce:
   `python3 app-next/e2e-next/run.py E2E-N1`.
2. **Existing-user fixture: delivered and proven (2026-09-17).** `E2E-F1`
   mints a disposable identity, grants it a real Adapty `premium` access level
   through the server-side API (never a purchase) and captures the
   setup-complete container; `E2E-E1` boots it to Home and emits `$screen
   home`; `E2E-V1` runs its 24-route guarded sweep on it; `E2E-F2` revokes the
   grant, deletes the identity and removes the snapshot. Run them in one
   invocation (`E2E-F1 E2E-E1 E2E-V1 E2E-F2`) because the fixture's Supabase
   session lives in the device keychain. StoreKit receipt truth stays with the
   SBX lane (`E2E-P1`) — the grant is not a purchase.
3. **The client-driven delete cannot finish on the simulator (E2E-A4's UI
   half).** The server accepts the delete (the simulator log shows a 204
   landing on the app's API connection at the confirm tap, with the
   FamilyControls/TCC cleanup churn starting immediately after; the harness
   half proves 204 → re-`PUT` 410 → Supabase 404 → PostHog person erased) but
   the app's post-acceptance local cleanup (FamilyControls
   `eraseLockedSelection`, CoreMotion-backed detection teardown) stays pending
   where those frameworks are absent, so the sheet keeps its retry note and
   `ui.delete_flow` records FAIL. Re-run the UI half on the device lane; the
   FAIL keeps the gap from hiding behind a simulator excuse.
4. **`xcrun xctrace record` cannot record a simulator on this host.** The
   delegate-relative stage medians no longer depend on it (they come from the
   unified log, finding above), but the xctrace route is closed here. Evidence:

   * **The missing piece is a template file, and it is not the blocker.**
     `xcrun xctrace list templates` (Xcode 26.4.1, `xctrace version 16.0
     (17E202)`) lists 25 templates with **no `Points of Interest` template**, and
     `xcrun xctrace record --template 'Points of Interest' …` answers `Cannot
     find template matching name: Points of Interest`. The *instrument* does
     ship: `xcrun xctrace list instruments` lists both `Points of Interest` and
     `os_signpost`, and the Point-of-Interest logic lives in
     `Contents/Applications/Instruments.app/Contents/Packages/Narrative.instrdst/`
     (its `Extensions/com.apple.dt.instruments.poi.dtac` ships, its
     `Contents/Templates/` carries only `Logging.tracetemplate`). Only the file
     `Narrative.instrdst/Contents/Templates/Points of Interest.tracetemplate` is
     absent — and `--instrument os_signpost` without `--template` records anyway,
     on the implicit Blank template (`Starting recording with the Blank template
     and os_signpost Instrument`).
   * **Every simulator recording dies at the same tap setup, whatever is asked
     for it.** Tried against the pinned `ExcerLock-Next` simulator, each of:
     `--instrument os_signpost --launch com.johansardar.excerlock`,
     `--instrument os_signpost --all-processes`,
     `--template 'Time Profiler' --launch com.johansardar.excerlock`,
     `--template 'System Trace' --launch com.johansardar.excerlock`,
     `--template 'App Launch' --launch com.johansardar.excerlock` — logs
     `xcrun xctrace … (DVTInstrumentsFoundation) Device disconnected while trying
     to set tap configuration` then `Device disconnected while trying to start
     tap` about 4 s in, launches and runs the app regardless, and then **never
     exits**. The recorder applies no `--time-limit` once the tap fails, so a
     `--time-limit 5s` run is still alive minutes later and its `.trace` is
     unexportable (`xctrace export --input … --toc` → `Export failed: Document
     Missing Template Error`). The paired `dtsecurity` handshake fails with
     `'fileDescriptorHandshakeWithReceivePort:' failed: (5)`.
   * **It is not stale device state.** Shutting the pinned simulator down and
     booting it again — clearing the `DTServiceHub` it had held open since the
     first failed attempt — reproduces the identical failure, and the host log
     shows the recorder spawning a fresh macOS-side `DTServiceHub` per attempt.
   * **`xctrace` and its packages are otherwise healthy**: a host recording
     (`xcrun xctrace record --template 'Time Profiler' --all-processes
     --time-limit 5s`, no `--device`) completes and exports normally.
   * **Statement for escalation:** the only broken piece is the CoreSimulator
     *instruments tap* in this Xcode 26.4.1 installation — not a template, not an
     Instruments package and not an Xcode/runtime mismatch (both are
     26.4.1/23E254a). A **device** recording is no longer untested, and it works:
     the same `--instrument os_signpost` invocation against the paired iPhone 13
     (`Il`, iOS 26.2.1) starts, launches the app, completes inside its time
     limit and exports the `os-signpost` table normally. A 20-cold-launch
     capture yielded the full B10 stage set for 11 launches, parsed into the
     device medians committed under
     `app-next/evidence/T15/device-startup-stage-medians/` (revision `3104ec02`,
     manual-signed preview Release). What kept the device half blocked was not
     xctrace: the installed build predated B10, and the device build failed
     under automatic signing (`No Accounts`, plus development profiles missing
     the associated-domains / push / Sign In with Apple / family-controls
     capabilities). The pre-issued `ExcerLock Development` profiles carry those
     capabilities and include the device, so a manual-signed build installs and
     records (recipe in the evidence README). Two recording quirks: the device
     tap keeps roughly a minute of signpost data and the stream warms up over a
     few launches, so a loop must pack 10+ launches after the first captured one;
     and the device must be unlocked, or launches never emit the startup stages.
     The `Logging` template the earlier note blamed belongs to the same broken
     simulator path.
5. **A first-ever offline launch cannot render the paywall.** AdaptySDK-iOS 4.0.2
   creates the profile on the server at activation (`createNewProfileOnServer`
   retries every 100 ms until the backend answers) and `identify` awaits that
   task, so on a fresh install the app's identity spine never commits and
   `loadPaywall`'s expected-identity gate never opens — the bundled fallback
   cannot answer. `E2E-N4` records the literal shape and reports the render
   BLOCKED-until `offline-first-launch-identity`; unblocking it needs the
   runtime's offline identity path (a persisted/generated profile id, or a load
   path that does not wait for `identify`), which the B3 follow-up did not
   change. Reproduce: `python3 app-next/e2e-next/run.py E2E-N4` (needs
   passwordless sudo for the `/etc/hosts` denial).

## Findings this program pinned down

* **A simulator build must sign to run locally and its keychain must be reset
  between fixtures.** Without `CODE_SIGN_IDENTITY=-` the app is unsigned; with
  added `application-identifier`/`keychain-access-groups` entitlements but no
  provisioning profile the simulator refuses to launch it. An *ad-hoc* signature
  is enough, but keychain items survive `simctl uninstall`, so a fresh install
  after any earlier run fails `expo-secure-store` with `ERR_KEY_CHAIN` and the
  boot gate reports "ExcerLock could not finish starting". `build.py` signs
  ad-hoc; the fresh-install fixture resets the device keychain and privacy
  grants (`simctl keychain reset`, `simctl privacy reset all`).
* **The simulator's unified log does carry the app's os_signpost stages — the
  earlier "no signpost records on this host" reading was a flag typo.** `log
  show` takes `--signpost` (singular) here; `--signposts` is rejected with
  `log: unrecognized option '--signposts'`, prints nothing and exits non-zero,
  which reads exactly like "this device has no signposts". With the correct flag,
  `xcrun simctl spawn <udid> log show --start <date> --signpost --style ndjson
  --predicate 'subsystem == "com.johansardar.excerlock.startup"'` returns the
  full B10 stage set — `AppDelegateEntry`, `FirstReactRender` (once per native
  content notification and once per JS call), `HydrationDone`, `RuntimeReady`,
  `BootGateRedirect` — each with a nanosecond `machTimestamp`. E2E-S1 reads its
  stage medians this way through `measure-startup.sh --sim-log`, the same parser
  and JSON schema the xctrace path uses. These stay simulator, delegate-relative
  numbers: the §6.2 budgets are still the device lane's (ADR 0021/0033).
* **`example.com` recipients make Supabase's OTP send fail with 500** (the mail
  provider rejects the domain). The email lane uses a disposable address on the
  project's verified sending domain instead.
* **Anonymous→email conversion OTPs are not mintable through the documented
  admin API**: `generate_link` answers `422 email_exists` for both
  `email_change_new` and `email_change_current` on that pending change. A3
  therefore pre-creates the disposable account and uses the returning-account
  recovery lane (admin-minted `magiclink` code), which exercises the same
  identity spine. `A3`'s verdict records the lane.
* **PostHog's identify ingestion lags longer than the near-real-time screen
  events** (the `$identify` row under the canonical UID appeared after the 60 s
  screen-event window in one run, within 1 s in another). A3 polls up to 180 s
  and records the real wait; the person mapping for the UID is recorded as an
  informational note because PostHog merges it asynchronously.
* **The sibling contracts landed mid-task.** `harness.detect_capabilities()` reads
  the worktree, so the first evidence runs reported `B1/B2/B4a/B4b/B6/B7/B10/A5`
  as pending and marked their assertions BLOCKED-until; after rebasing onto main
  (where all of them landed) the same scenarios ran their analytics assertions for
  real and N1's only remaining failure is the O01 gap. The capability map in every
  `verdict.json` records which side of that boundary the run was on.
* **`idb ui text` is lossy mid-string and the mint must verify every field.**
  The first mint attempts typed `e2e-fixtur` while the field kept `e2e-fixe`,
  and a 43-backspace clear dropped most of its backspaces; clearing and typing
  again could never converge. The harness types four characters at a time,
  re-reads the field, repairs divergence from the common prefix and stops the
  mint when a field still does not hold the intended value
  (`harness.type_verified`, unit-tested against a fake lossy keyboard).
* **An entitled `/paywall` visit is a one-frame mount.** `PaywallSlot` replaces
  the route with Home as soon as the entitlement is trial/active, so the
  guarded sweep saw its `$screen paywall` row in the same millisecond as the
  home row and no paywall label 2.6 s later. The sweep no longer judges that
  visit by label (the `$screen` row is the proof); five other route markers
  had also drifted from the current copy and were corrected.
* **PostHog ingestion for this project is bursty**: screen rows can arrive in
  ~1 s, while the paywall's load-driven `paywall_viewed` / `$screen paywall` and
  the `$identify` row under a new distinct id have taken 300 s+. On 2026-09-17
  the fixture runs hit even longer query/ingestion waits (E1's `home` row and
  V1's guarded screen set were retrievable by hand minutes before the harness's
  own poll saw them), always inside the extended window, which now costs the
  SIM runs ~15 min each. The plan's 60 s window is the first poll;
  `E2E_PAYWALL_WAIT` (default 300 s) is the extended one, and a miss after both
  is reported BLOCKED-until-ingestion, never as an app failure — except where
  the app-side proof is independent (A3 asserts the persisted distinct id
  locally).
* **The simulator has no per-device network switch; N4 denies the Adapty hosts
  in `/etc/hosts` for the launch under test.** Every default-cluster endpoint
  (`api.adapty.io`, `fallback.adapty.io`, `configs-cdn.adapty.io`,
  `api-ua.adapty.io`) is mapped to `0.0.0.0`, the denial is verified through the
  system resolver and a direct HTTPS connect before and after the walk, and the
  file is restored byte-for-byte in a `finally`. This is a host-wide lever that
  lasts only for the scenario; run it when no sibling E2E lane is mid-run.
* **A first-ever offline launch cannot render the paywall, fallback or not.**
  AdaptySDK-iOS 4.0.2's `activate`/`identify` create the profile with
  `createNewProfileOnServer`, which retries every 100 ms until the network
  answers; the app's identity spine awaits `identify`, so `loadPaywall`'s
  canonical-identity gate never opens. N4 therefore establishes the live profile
  with one online launch that never opens the paywall (verified against the
  app's own `AdaptySDK_Purchaser_Info` / `AdaptySDK_Cached_Flow` UserDefaults),
  then runs the launch under test with Adapty denied and proves the bundled file
  is what renders. The first-launch-offline case is a separate, pre-existing
  identity-spine limitation, reported here rather than fixed by this scenario.

## Fixture policy and the existing-user fixture

* **fresh install** — `simctl uninstall` + `simctl install` of the build under
  test, so onboarding runs for real. Nothing is hand-edited.
* **existing user** — a captured app-container snapshot (`fixtures/existing-user`,
  restored with `simctl` container copy) whose *entitlement is a real Adapty
  server-side access level*, not a fake written into the app.

### How the fixture is minted (E2E-F1)

`adapty.py` grants the dashboard access level `premium` to a profile by
`customer_user_id` through Adapty's server-side API (`POST
/api/v2/server-side-api/purchase/profile/grant/access-level/`, `Authorization:
Api-Key <ADAPTY_SECRET_KEY>`, app `9b8a6cf2-22c5-46f9-b938-35c27da2c66f`). The
`E2E-F1` scenario uses that grant to reach a state the simulator could not reach
before:

1. pre-create the disposable Supabase identity (the A3 email lane) and grant
   `premium` to its UID **before** the app signs in, so the first profile fetch
   the app's own identity spine makes already carries the live access level —
   the entitlement path (`AdaptySubscriptionAdapter` → `mapEntitlement`) runs
   unmodified and no production refresh hook is faked;
2. drive the real sign-in UI (welcome footer → email → admin-minted OTP);
3. assert the app *observed* it: `RootNavigator` only exposes `setup/*` while
   `entitled && !setupComplete`, so landing on setup X4 is proof the entitlement
   store holds trial/active, and reaching Home through X5 proves
   `setupComplete`;
4. capture the app container and write `fixtures/existing-user.meta.json`
   (identity, grant, run, build);
5. `fixture.ensure_live` re-asserts the captured grant idempotently before every
   restore, so a fixture minted on one day still carries a live entitlement a
   day later.

`E2E-F2` is teardown: it revokes the grant (with an inactive readback), deletes
the disposable Supabase identity (with a 404 readback) and removes the snapshot
and metadata, so a torn-down fixture can never be mistaken for a usable one.
Never commit the secret key: it resolves through `harness.env_value` (process
env → `~/.excerlock/env` → `~/.excerlock/ADAPTY_SECRET_KEY`).

### One keychain, one invocation

Only the container is snapshotted; the Supabase session lives in the simulator
**keychain** (`expo-secure-store`). Any fresh-install scenario resets that
keychain, so the fixture's consumers must run in the same invocation as the mint
and before a fresh-install scenario. `E2E-V1` owns both states internally and
runs its guarded sweep *first* for exactly this reason; `E2E-F1 E2E-E1 E2E-A4`
is a valid one-invocation sequence, `E2E-F1` then a fresh-install scenario then
`E2E-E1` is not (the fixture would boot with a new anonymous session).

`E2E-A4`'s confirmation consumes the identity and `E2E-V1`'s fresh phase resets
the keychain, so those two consumers can never share one mint; each gets its own
`E2E-F1` (the validated sequences under Commands).

### What the fixture does not prove

The server-side grant is not a purchase: it says nothing about StoreKit, the
`sandbox` receipt, or the §8.1 binding. That truth stays with the SBX lane
(`E2E-P1/P2/X1`) on hardware; this fixture only removes the *entitlement*
blocker from the SIM-lane scenarios.

## PostHog verification

Every scenario reads the run's `$device_id` from the app's own PostHog storage
(`Documents/.posthog-rn.json` in the app data container — posthog-react-native
persists a single JSON blob there) and then queries project 537075 through HogQL
filtered on `properties.$device_id` (plan §4.5). Queries poll until the predicate
holds or 60 s elapse; the raw rows and wait time are archived in `verdict.json`.
Sign-in scenarios additionally assert rows under the canonical Supabase
`distinct_id`.

## Email sign-in lane

`supabase.py` mints the six-digit code server-side with the service key
(`admin.generate_link` → `email_otp`); no inbox scraping and no browser. The
disposable identity is `e2e-a3-<run-id>@excerlock.com` (the project's verified
sending domain, receiving disabled) and the scenario tears it down through the
app's own deletion
contract (`DELETE /v1/user` → 204, re-`PUT` → 410, Supabase admin → 404).

## Rules this harness obeys

* No push, no PR, no EAS build/update, no dashboard mutations, no release-lock
  operations (brief: local-only; plan §8.10).
* No StoreKit purchase UI re-runs (§8.1 standing instruction): purchase assertions
  stop at the CTA.
* No Maestro, no dev-server dependency: the build under test embeds its bundle.
* Evidence stays under `out/<run>/`; secrets never enter the repository.

## Adding a scenario

1. Subclass `harness.Scenario` (`id`, `title`, `lane`, `users`, `fixture`,
   `requires`) and implement `run(ctx)`.
2. Declare sibling dependencies through `ctx.gate(...)` so an unlanded contract
   becomes BLOCKED-until, not FAIL.
3. Register it in `scenarios/__init__.py`; it appears in `--list` and `--all`.
