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
| `E2E-N1` | fresh install | real onboarding O01→P, paywall | full walk observed step by step; paywall renders; live products; CTA; `$screen` per step; `paywall_viewed`; startup first-frame budget | walk/paywall provable; analytics assertions BLOCKED-until `B4a`/`B4b`/`B6`; live products BLOCKED-until the StoreKit binding (§8.1) |
| `E2E-E1` | existing user | relaunch, no paywall, Home | boot destination; `$screen home`; interactive-Home budget | BLOCKED-until the entitled existing-user fixture (see gap below) |
| `E2E-V1` | fresh install | every production route (onboarding steps + deep links) | one `$screen` row per visited route; route-coverage table | onboarding sweep provable; `$screen` rows BLOCKED-until `B4a`/`B4b`; guarded routes BLOCKED-until the fixture |
| `E2E-S1` | fresh install | 10 cold launches, signpost timings | medians vs §6.2 (first frame ≤1.5 s, interactive Home ≤2.5 s) | first-frame median measured; Home median BLOCKED-until the fixture; extra stage marks BLOCKED-until `B10` |
| `E2E-A3` | fresh install | welcome footer → email sign-in | signed-in UI; Supabase user; `PUT /v1/user` 204; PostHog rows under the canonical distinct id; teardown 204/410/404 | fully automatable (admin-minted OTP) |
| `E2E-A4` | existing user | Settings → Account → delete | 204, re-PUT 410, Supabase 404, PostHog person erased, local wipe | UI half BLOCKED-until the fixture; harness-driven API half runs and asserts the live contract |
| `E2E-E2` | — | OTA receipt, binary unchanged | **documented stub** (publishes a preview EAS Update; §8.10 keeps release-lock ops out of E2E automation) | BLOCKED by design |

Not in scope here: `E2E-N3` purchase UI (standing instruction: no StoreKit UI
re-runs; purchase assertions stop at the CTA, §8.1) and the SBX lane
(`E2E-P1/P2/X1`), which owns sandbox receipt truth on hardware.

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
