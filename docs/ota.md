# OTA updates


Single owner: `app-next/src/packages/updates/updates.ts` owns every `expo-updates` call.
No other shipping source file may import `expo-updates` (enforced by `./excer check`).
First-install onboarding catch-up is defined in [ADR 0060](adr/0060-first-install-onboarding-ota-catchup.md).
The ordinary tab coordinator below still applies to existing installs.

### Coordinator mount contract (T03 revision: live getters, pending-first, no auto-clear)

Mount `useOtaCoordinator` at the runtime root (T10), above every guard. It is
never gated on paywall or setup state; it receives primitive safe-boundary
inputs via LIVE getters (`OtaSafetyGetter`/`OtaEnvelopeGetter`) and fails closed
when any input is unknown or any getter throws. The hook reads the latest DI
via refs plus real `AppState.currentState` on every evaluation, so a stale
foreground captured before a 75s check/fetch can never reload:

- `purchaseOrRestoreBusy`, `permissionPromptPending`, `cameraActive`,
  `walkingActive`, `proppedActive`, `isForeground` (live from `AppState.currentState`),
  `route` (live pathname from root; see below)
- Safe only when all clear, foreground, and on an actual tab root
  (`/home`, `/conditions`, `/analytics`, `/settings` as returned by
  `usePathname()` with groups excluded; `'/'` is BootGate transient and never
  safe). Legacy `/(tabs)/…` Stack names normalize to the same canonical paths
  (`normalizeOtaRoute`); arbitrary routes are never guessed. See
  `evaluateSafeBoundary`/`isOtaSafeRoute`. Root must provide the explicit
  semantic pathname (no false positives at BootGate).
- First launch: native `ON_LOAD` owns check+download inside
  `fallbackToCacheTimeout`. JS only observes `useUpdates()` via
  `observeStartup()`; it never runs a duplicate check on the same launch.
  Later native downloads are observed via `observeDownloadedUpdate()` without
  repeated startup checks and without resetting unrelated staged state. An
  observed id gains reload authority only on a genuinely new foreground
  (generation `foregroundSeq` advances); the same foreground returns
  `deferred-unsafe/needs-fresh-foreground`, so a timed-out fetch result can
  never be resurrected through observation.
- Background tracking keeps the FIRST departure from active until the next
  active (background→inactive does not overwrite), so an iOS inactive-after-6h
  event cannot reset the duration to zero.
- Later: on foreground, an eligible pending update is attempted FIRST
  regardless of the 6h check cadence, with fresh live safety; unsafe defers
  until another foreground. Startup staged updates apply at the next safe
  boundary without a second launch check. Otherwise after ≥ 6 h in background,
  `checkForUpdateAsync` then `fetchUpdateAsync` with separate budgets
  (`OTA_CHECK_BUDGET_MS`, `OTA_FETCH_BUDGET_MS`; never one shared budget),
  then `reloadAsync` only after live revalidation immediately before reload
  after EVERY async write (purchase/camera/walking/background starting during
  fetch or storage awaits defers). Timed-out work revokes its epoch and can
  never reload late; concurrent checks/reloads return `busy`/`operation in flight`.
- Reload-loop guard persists `{ updateId, launchCount }`; the same update id
  is retried at most twice without a successful launch, then blocked and
  reported. Corrupt persisted guard throws (`OtaCorruptGuardError`) and never
  silently resets retry authority. Required guard/envelope read/write failures
  deny reload and report; last-check persistence is best-effort only
  (explicitly distinct, never denies). Only `markSuccessfulLaunch(runningUpdateId)`
  clears the guard — T10 calls it after hydrated stable app; the hook never
  auto-clears on mount. A pending id equal to the currently running id is
  rejected and cleared (`already-running`), never retried.
- Persist a `resumeEnvelope` (`route` + `draftIds`) before every reload. On the
  next hydrated launch, consume it once and clear it before navigation. An onboarding
  envelope is consumed by the launch gate and resumes unfinished onboarding or the
  explicit before-Paywall destination. The tab host leaves that envelope untouched.
  A tab route resumes only when the current Journey already admits the selected account
  and the route is one of the existing safe tab roots. The envelope never restores
  Identity, Entitlement, Journey admission, unlock routes, or payment authority.
- `checkAndStage` is diagnostics-only (never used by the hook launch path);
  it stages without reloading and respects the same budgets/running guard.
- Observability: `getOtaObservabilityContext()` exposes `update_id` and
  `runtime_version` for T06 to register as Sentry `release`/`dist`
  (`com.johansardar.excerlock@<version>+<build>`, `<runtimeVersion>-<updateId>`)
  and PostHog super-properties after every reset. Sourcemaps upload per
  `eas update`/build remains T06/root-owned.

Code signing: Expo account is Free, so the conditional signing requirement is
not enabled. Do not create keys and do not claim tamper verification. The
tamper-manifest proof below runs once per certificate only when signing is
enabled.

### Submission scope of remote configuration (Wave 2 audit, fix 10)

An OTA may carry anything the reviewed binary already contains; it may never
change what users can reach beyond that. Treat each of the following as
**new-submission material — never an OTA**:

- Widening the `stride_gate_config` clamps beyond their measured endpoints
  (ADR 0035), weakening a one-directional field, or disabling the kill switch
  defaults.
- A new PostHog flag, or any new consumer of the existing flag rail
  (`./excer check` bounds the rail).
- A `shield_copy` (or any other remote copy) change that alters
  user-visible capability — what the app lets a user do, gate, or reach.

Review Notes (`docs/asc/review-notes.md`) commit to "remote configuration only
tunes analytics-driven copy, step order and thresholds whose defaults are
exactly the reviewed behavior"; the review binary must keep matching that
sentence for every OTA it receives. If an OTA would move any of the above,
ship it inside the next new-submission binary instead.

### Release ritual (gate for T16; script `app-next/scripts/verify-ota.sh` revision)

1. `eas update --branch production --message "<sha>"` only from a tagged
   commit on `main` after CI is green, under the release lock
   (`python3 scripts/agent-ops.py run -- ...`).
2. Determine the numerically newest `READY_FOR_SALE` IOS version from all
   paginated ASC versions (never from local `app.json`; numeric sort picks
   `1.0.10` over `1.0.9`), resolve its attached build via
   `asc versions view --include build`, fetch authoritative
   `asc builds info --build-id` (`attributes.version` = `CFBundleVersion`
   build number) and `asc apps view` (`bundleId`), then bind the COMPLETE
   `--ipa` (`Payload/*.app/Info.plist` + bound `Expo.plist`): IPA
   `CFBundleIdentifier`/`CFBundleShortVersionString`/`CFBundleVersion` must
   equal ASC bundle/live marketing version/attached build number, and IPA
   `EXUpdatesRuntimeVersion` must equal `--expected-runtime`. Standalone
   unbound `--expo-plist` and unrelated builds fail. Publish only to that runtime.
3. On physical phones: delete the app, install from the public App Store AND
   separately from TestFlight, launch twice each, then pull each
   `Library/Application Support/.expo-internal/expo-v11.db` and assert per-store
   that the intended `update_id` is present with `successful_launch_count > 0`
   (BLOB `id` compared via `hex(id)`) AND `runtime_version == expected runtime`.
   Both installs are required (`--appstore-db` + `--testflight-db` with
   `--appstore-evidence`/`--testflight-evidence` caller-observed device/source
   metadata; the script audits caller-provided artifacts and never claims it
   observed installation). Manifest/server metadata is never device proof.
   Missing either db is a `RUNTIME LIMIT` (exit 2), never a skipped test marked
   passed.
4. Prove a tampered manifest is rejected by the release binary once per
   certificate (signing-enabled builds only; skipped with no claim on Free).
5. Record all of it in `app-next/evidence/release-<version>/`.

Example:

```sh
app-next/scripts/verify-ota.sh \
  --asc-app-id 6787265352 \
  --expected-update-id <uuid> \
  --expected-runtime 1 \
  --ipa /path/to/live.ipa \
  --appstore-db /path/to/appstore-expo-v11.db \
  --testflight-db /path/to/testflight-expo-v11.db \
  --appstore-evidence "UDID=..., store=App Store, exported=..., launches=2" \
  --testflight-evidence "UDID=..., store=TestFlight, exported=..., launches=2"
```

### Bumping `runtimeVersion`

Only when `plans/ship/02-native-manifest.md` changes or a native
dependency's iOS code changes. ADR 0060 narrowly exempts the compatible internal reload-cover and pre-content recovery fixes, which changes no bridge API or schema. Procedure: bump the string, build, submit,
wait for Ready for Sale, then publish JS to both the old and the new runtime
until the old runtime's 30-day active-install share is under 5%. Never orphan
a runtime that still has installs. Version bumps never change
`runtimeVersion`.


### First-install onboarding catch-up for build 18

Native `ON_LOAD` owns the first download. JavaScript observes `useUpdates()` through the update package, never starts a concurrent startup check/fetch, and holds only a fresh install. The eight-second budget uses Expo's native controller-start log timestamp so it includes the gap before React Native initializes. If that timestamp is unavailable, the native-duration/runtime clock reserves 1.5 seconds for bootstrap. Expo timestamps have one-second resolution, so the hold is conservatively shorter by up to a second. Runtime hydration proceeds behind the cover. Navigation prepares the destination during three emphasized motion durations (1,440 ms), and a standard motion duration (240 ms) is reserved for the final native handoff. Both reserves sit within the launch budget, so expiry exposes a prepared page without paying for another mount. Transiently unsafe startup boundaries retry within the remaining budget; these retries never start network checks or downloads. A failed download opens the embedded onboarding without an error message. Returning installs retain the normal native three-second fallback and have no JavaScript hold.

The cover uses the existing running-lock artwork and UI tokens. `reloadAsync` receives a full-screen image with the spinner and fade disabled. The new root renders its own cover in the registered root and retains the native splash until the first destination reports layout and crosses two render frames. Font loading preserves that same cover instance. A vector traced from the approved mark sits beneath its bitmap in the ordinary root view, so the reload's first frame never waits for image decoding. The pinned `expo-updates+57.0.23.patch` decodes and lays out a local-file image, presents the native overlay, then starts React teardown; the owner requires a local cover URI. Its `excerlock-cover` URI fragment opts into a destination-ready handoff because Router's wrapper can count as first content before the app root exists. The patch enables the already exported hide method in Release, and the owner calls it after the destination reports layout and crosses two render frames. An eight-second native timer prevents an indefinite overlay. Unmarked overlays keep Expo's first-content dismissal; remote image handling is unchanged. The old page stays visible until the native overlay is prepared; its JavaScript cover is not remounted before the native request. Splash retention starts in the custom entry before Router. The registered React root draws the cover outside Router, before its asynchronous route layout can mount. It waits for native splash-retention acknowledgement before drawing first content, and keeps the bitmap transparent until decoded so it cannot obscure the vector fallback. The launch cover uses the ordinary root view; a separate FullWindowOverlay would obscure the retained splash before its artwork was ready. The native overlay uses explicit scene bounds and stays above the app without becoming its key window, so the navigation overlay remains attached to the app window. These changes address both ends of the native teardown gap. Expo’s recovery monitor also retained the old page’s pruned pipeline across an explicit reload. The pinned patch resets that pipeline for a new explicit launch, preserves its finite attempts during active recovery, and invalidates old handler-expiry timers by monitor generation. This lets a pre-content crash after an onboarding boundary recover to embedded code. The patch must be in build 18's binary. It preserves the existing bridge API and stored schemas, so these internal fixes preserve runtime 4 (ADR 0060). The first destination skips the native slide and its initial page-entry motion, then releases the cover after the destination reports layout, preventing the blank index route from flashing when Expo removes its overlay on first content. Later page changes retain their normal motion.

`config/onboardingFlow.json` declares the version and a SHA-256 fingerprint of tokenized flow, step IDs, answer model and validation, answer-to-Condition mapping, store, navigation and flag-order definitions. Choice identifiers, multiple-selection behavior and answer-processing functions are included through a semantic AST snapshot that removes display copy and icons. A changed fingerprint requires a version above HEAD and origin/main. Update the fingerprint with `EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer ota-lab fingerprint`. Copy and artwork changes keep the version. Never reinterpret a saved answer: introduce a new key or choice identifier for a new meaning.

The effective order is frozen when onboarding starts. A downloaded same-version update reloads at the next stable Continue or Back boundary, after answers, completed pages, profile and runtime writes settle. A different or missing version waits until the final Continue before the Paywall. The explicit Paywall envelope finishes the old flow; newly inserted questions are not asked during that handoff, so the new Paywall and Setup must remain compatible with existing answers. Unknown saved page names use the current `pathFor` order and completed/answered pages to select the first unfinished prerequisite. Flag orders cannot omit required questions or put the impact story before its estimate.

The install record `excerlock-next.ota-install.v1` permits one catch-up reload until the first Paywall. The current first-onboarding Journey also suppresses tab reloads after Setup; later cold sessions regain the existing tab-root coordinator once that Journey has ended. An admitted Sign in shortcut ends catch-up when it reaches Setup or the app. The existing two-attempt per-update guard and one-shot resume envelope remain required. Live safety is rechecked after every asynchronous storage write. Purchase/restore, sign-in, Paywall and later routes, permission prompts, background state, Reanimated page entry, native navigation transitions and page overlays deny catch-up reload authority. If permission dismissal is still unsafe at the final handoff, it waits up to one second and otherwise keeps the reminder open for another Continue.

`paywall_viewed` fires once per mounted view after plans load. Every impression adds `is_embedded` and `update_id`. The first observed impression on a known fresh install sets `first_paywall_view` and persists its observation in `excerlock-next.first-paywall.v1`; older installs are excluded from that new-install count because their historical first view cannot be reconstructed. PostHog's existing running-update super-property remains registered after reset. No answer or sensor detail is added to analytics.

### Local Release update lab

Everything lives under `tools/excer/ota-lab/`; generated projects, exports and evidence live under ignored `.excer/ota-lab/`. This lab uses the assigned hidden worker simulator, port 8092 for development proofs, and loopback port 8098 for Updates. It never contacts EAS. `EXCER_OTA_LAB_URL` accepts HTTP loopback URLs only and rejects EAS build/profile and Trace Lab environments.

Preparation makes an isolated source snapshot with local fake service ports and native Expo Updates enabled in Release. It strips production client configuration, the dev launcher and upload tooling. Production runtime construction and background task imports are disabled in that snapshot. Production sources retain the real adapters. No native runtime-version bump is needed.

```sh
EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer ota-lab prepare
EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer ota-lab native
EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer ota-lab build
EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer ota-lab serve
```

Keep the server in its own terminal. `build` uses BB's tracked local Xcode build, caches in `.excer/ota-lab/derived`, the Release configuration and generic arm64 simulator destination with signing disabled. If BB cannot confirm the CLI build, use its `xcode_build` tool with the same workspace, scheme, arguments and derived-data path; do not treat an unconfirmed run as success. Never build an App Store archive for this lab. Changes to the shipping code require fresh preparation and an incremental build before verification.

```sh
EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer ota-lab list
EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer ota-lab run first-fast
EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer ota-lab run first-held
EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer ota-lab run same-o07 added-page
```

Multiple named cases run serially. Every case has its own five-minute deadline, fresh install, video, screenshots for each visited page, accessibility labels, `result.json`, event trace and a snapshot of native update launch/failure counts. The result uses the actual cover-release event after the destination has rendered, rather than polling latency, to record launch to the first exposed page and the interval from native reload request to destination cover dismissal. The video is authoritative for flashes and completed visual transitions. The runner samples it at 30 fps and fails uniform pale frames after visible content; `visual-review.json` records the times and contact sheets show launch and reload handoffs. Other visual artifacts still require reviewing the recording. Rerun this check with `EXCER_SIM=ExcerLock-ota-first-launch EXCER_METRO_PORT=8092 ./excer ota-lab review <evidence-dir>`. Failed and superseded attempts remain in evidence; use the final report's table to identify the verified run.

The server implements Expo Updates manifests and assets, identity/hash validation, gzip delivery, rollback directives, delayed, never-completing, cut-off and corrupt transfers, and fresh IDs/timestamps for successive publications. Asset keys match Expo's bundled packager hashes, so unchanged bundled assets are reused. `/control` selects a prepared variant and its delay or release page. `/network` severs pending local update transfers and rejects new update requests while offline; control and evidence remain reachable. This models transport loss for the lab URL, not device-wide Wi-Fi switching. `/events` contains only route, update, timing and boolean proof metadata; saved-answer comparison stays on-device and reports a boolean.

Prepared updates cover copy, card radius, an added informational page before the current position, removed muscle follow-up, an informational page added only to the Gym branch, renamed name page and a throw before first content. Every structural fixture increments the flow version. Back-to-back publication uses a lab-only check/fetch after the native first download has completed, through the sole update owner, so two real downloaded candidates can compete before one boundary reload. The shipping startup never makes that second check.

Purchase and restore cases use an eight-second fake-port barrier, and notification permission uses the existing fake prompt UI. These prove update safety with overlapping operations, not StoreKit transactions or physical permission sheets. Crash evidence must include a native failed launch and sensible embedded recovery; merely opening embedded code is insufficient. A rollback first installs the copy update and then supplies the directive on reopening.

The production resolved config before this change and after it differs only at `.extra.onboardingFlowVersion`, which is required by the flow contract. Removing that additive field produces an identical resolved object; update URL, channel, runtime and native configuration are unchanged. The report links the exact resolved-config diff and separate lab opt-in isolation evidence. Literal byte identity with the original config cannot coexist with adding the required manifest field.

The transition case stretches one page's Reanimated entry to four times its token duration only in the isolated lab. It presses Get started while entry is active and asserts that the reload waits for its completion. Changed-flow cases proceed through purchase and Sign in, skip the shared Screen Time ask, and require the Walking motion or Gym location Setup page. Their committed Condition is compared with preserved answers on-device; only the matching boolean reaches the lab server. The network-interruption case accepts embedded fallback when the severed download cannot finish, and checks that the same question remains visible.
