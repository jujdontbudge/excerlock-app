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

# mint the existing-user fixture from the currently installed app container
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
| `EXPO_PUBLIC_*` + aliases (`~/.excerlock/env`) | `build.py` preview build |

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
| `E2E-E1` | existing user | relaunch, no paywall, Home | boot destination; `$screen home`; interactive-Home budget | BLOCKED-until the entitled existing-user fixture (see gap below) |
| `E2E-V1` | fresh install | every production route (onboarding steps + deep links) | one `$screen` row per visited route; route-coverage table | onboarding sweep + `$screen` rows PASS; 20 guarded routes BLOCKED-until the fixture |
| `E2E-S1` | fresh install | 10 cold launches, launch timing | medians vs §6.2 (first frame ≤1.5 s, interactive Home ≤2.5 s) | coarse launch→surface measured; §6.2 budgets BLOCKED-until the device lane (ADR 0021/0033) and the Home budget until the fixture; xctrace stage export unavailable on Xcode 26.4 |
| `E2E-A3` | fresh install | welcome footer → email sign-in | signed-in UI; Supabase user; `PUT /v1/user` 204; PostHog rows under the canonical distinct id; teardown 204/410/404 | **PASS** (recovery lane, admin-minted code — see findings) |
| — | — | `E2E-POSTHOG-TIMEOUT` env | `E2E_POSTHOG_TIMEOUT` (screen window, default 60 s) and `E2E_PAYWALL_WAIT` (extended poll for load-driven events, default 300 s) tune the PostHog windows | — |
| `E2E-A4` | existing user | Settings → Account → delete | 204, re-PUT 410, Supabase 404, PostHog person erased, local wipe | UI half BLOCKED-until the fixture; harness-driven API half runs and asserts the live contract |
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
| `20260917T1600Z` | `3cb66c1f` | `E2E-N1` | **FAIL** (one real gap) + BLOCKED budget | PASS: fresh install boots real onboarding; all 29 screens walked in flow order; paywall renders the two live placement plans (Premium Annual/Monthly, $59.99) matching the Adapty `onboarding` placement; CTA; run-scoped `$device_id`; `paywall_viewed {placement: onboarding}`; `$screen paywall`; 35 ingested rows in 2 s. **FAIL**: 27/28 visited steps have a `$screen` row — **O01 emits none**. BLOCKED: §6.2 startup budget (device measurement, ADR 0021/0033) |
| `20260917T1600Z` | `3cb66c1f` | `E2E-V1` | BLOCKED | PASS: 29-screen onboarding sweep, `$screen` step rows for every step (incl. `O13`), `$screen paywall`, run-scoped `$device_id`, ingestion. BLOCKED: 20 of 51 route visits sit behind the setup-complete/entitled guards (existing-user fixture) |
| `20260917T0650Z` | pre-overhaul build (2026-09-17T10:40Z, revision not recorded) | `E2E-A3` | **PASS** | sign-in sheet → email → admin-minted code → sheet closes → re-opened sheet shows the signed-in account; Supabase user not anonymous; `PUT /v1/user` 204; app persisted the canonical UID as its PostHog distinct id; `$identify` row under that UID; teardown 204/410/404 |
| `20260917T0640Z` | pre-overhaul build (2026-09-17T10:39Z) | `E2E-S1` | BLOCKED | PASS: 10 cold launches measured (launch call ~0.2 s; launch → first interactive surface 3.8–7 s through idb polling). BLOCKED: the xctrace stage export, the §6.2 budget gate (device lane) and the Home budget (fixture) |
| `20260917T0640Z` | pre-overhaul build | `E2E-E1`, `E2E-A4` | BLOCKED | existing-user fixture unavailable (fixture gap below) |
| `20260917T0640Z` | pre-overhaul build | `E2E-E2` | BLOCKED | by design: publishes a preview-channel EAS Update (documented stub) |

The A3/S1/E1/A4/E2 evidence predates the UI-overhaul commits that landed after
those runs; their verdicts still record the build's `builtAt`/artifact path, and
the harness re-runs them unchanged against any newer build.

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
2. **The existing-user fixture is unreachable on the simulator.** A setup-complete
   profile needs an entitlement, and the only entitlement sources are a sandbox
   purchase (hardware, SBX lane `E2E-P1`) or the StoreKit binding §8.1 leaves
   unresolved. E1/A4/Home-budget/guarded-route coverage unblock the moment the SBX
   lane captures `--capture-fixture existing-user`.
3. **No xctrace stage export on this host.** Xcode 26.4 has no `Points of
   Interest` template and a `Logging` recording did not complete, so the
   delegate-relative stage medians that B10/`measure-startup.sh` produce cannot be
   captured here; and per ADR 0021/0033 the §6.2 budgets are device measurements
   anyway. Run the xctrace half on a host that can record it, and the budget gate
   on a signed TestFlight build.

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
* **The simulator's unified log carries no os_signpost records on this host**
  (`log show --signposts` returns zero lines device-wide, `log stream` has no
  `--signposts` flag), so the §6.2 sub-second startup budgets cannot be read the
  way plan §6.3 describes; they need the xctrace numeric parse that B10 owns.
  S1 records coarse launch→surface numbers meanwhile.
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
* **PostHog ingestion for this project is bursty**: screen rows can arrive in
  ~1 s, while the paywall's load-driven `paywall_viewed` / `$screen paywall` and
  the `$identify` row under a new distinct id have taken 300 s+. The plan's 60 s
  window is the first poll; `E2E_PAYWALL_WAIT` (default 300 s) is the extended one,
  and a miss after both is reported BLOCKED-until-ingestion, never as an app
  failure — except where the app-side proof is independent (A3 asserts the
  persisted distinct id locally).

## Fixture policy and the SIM-lane fixture gap

* **fresh install** — `simctl uninstall` + `simctl install` of the build under
  test, so onboarding runs for real. Nothing is hand-edited.
* **existing user** — a captured app-container snapshot (`fixtures/existing-user`,
  minted with `--capture-fixture`, restored with `simctl` container copy).

**Gap, stated plainly:** on the simulator there is no way to mint an *entitled*
profile — a purchase needs the StoreKit binding that §8.1 leaves unresolved, and
`sandbox` purchases need hardware — and the app's own guards require an
entitlement before setup can complete (`RootNavigator` protects `setup/*` and
`(tabs)` behind `setupComplete`, which only setup X5 sets). Every scenario that
needs a setup-complete profile (`E2E-E1`, `E2E-A4` UI half, `E2E-S1` Home budget,
the guarded half of `E2E-V1`) therefore reports BLOCKED with that exact reason
instead of a fake pass. The fixture becomes available as soon as the SBX lane
(`E2E-P1`) captures a snapshot after a real sandbox purchase; the harness then
runs those scenarios unchanged via `--capture-fixture existing-user`.

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
disposable identity is `e2e-a3-<run-id>@example.com` (a domain that cannot
receive mail) and the scenario tears it down through the app's own deletion
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
