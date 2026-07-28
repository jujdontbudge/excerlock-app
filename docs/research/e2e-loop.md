# Maestro E2E + visual-diff loop on the iOS simulator

**Ticket:** #20 · **Feeds:** the test-harness prototype · **Date:** 2026-07-28

Implements the map's locked test strategy: every feature/screen runs end-to-end **on simulator** against a mocked signal boundary (`docs/research/healthkit-coverage.md` §mock-boundary, `docs/research/device-activity-gaps.md`), in an agent-driven loop until functionally **and** visually perfect; shields/geofence/motion get a physical-device smoke suite.

All facts below verified 2026-07-28 against current docs/repos/binaries (sources at end), not memory.

## Recommendation: Maestro. (XCUITest evaluated and rejected)

XCUITest would mean adding a Swift UI-test target to the Xcode project, which `npx expo prebuild` regenerates on every native sync — the target must be re-injected via a custom config plugin or a committed native project, a standing maintenance tax on exactly the file Expo wants to own. Element targeting works fine (RN `testID` → `accessibilityIdentifier`, `app.buttons["id"]`), and XCUITest's in-process idle-synchronization is genuinely less flaky than Maestro's out-of-process polling; `xcodebuild test -resultBundlePath` + `xcrun xcresulttool get test-results summary` (Xcode 16+) even yields machine-parseable JSON. But every test is compiled Swift: the agent loop would pay an Xcode rebuild per test edit, and EAS has **no XCUITest job type** — Expo's entire official E2E story (both current guides and the pre-packaged `type: maestro` workflow job) is Maestro-based.

Maestro wins on every axis that matters to *this* loop: YAML flows are editable by an agent without recompiling anything, the iOS driver runs against a plain simulator build, tags/JUnit output/artifacts are first-class, and since CLI v2.2.0 (2026-03) Maestro has a **built-in local visual assertion** (`assertScreenshot`, threshold-based, with diff generation) — the "looks perfect" gate no longer even requires an external differ, though we keep odiff as a stricter machine-readable second pass. Flakiness is manageable with the mitigations below, and the same flows run unchanged on EAS (`type: maestro` job) if we ever want cloud runs. **Decision: Maestro CLI ≥ 2.7.0 locally on this Mac, XCUITest not used; physical-device coverage comes from the manual smoke checklist, not an automated rig.**

## Toolchain facts (verified)

- **Maestro CLI:** latest `cli-2.7.0` (2026-07-20). Install: `brew tap mobile-dev-inc/tap && brew trust --formula mobile-dev-inc/tap/maestro && brew install mobile-dev-inc/tap/maestro` (or `curl -fsSL "https://get.maestro.mobile.dev" | bash`). **Java 17+ required** (`JAVA_HOME` set). Needs Xcode + CLT. Use ≥ 2.7.0: it shipped a batch of iOS-driver stability fixes (false app-crash errors, timeout handling, kAXErrorInvalidUIElement recovery) and the revamped per-flow artifact bundle (`manifest.json`, `commands.json`, `logs/`, screenshot before every step, **view hierarchy on failure**, device logs).
- **iOS driver:** an XCTest runner Maestro installs on the sim. It launches Simulator.app itself (`open -a Simulator --args -CurrentDeviceUDID <udid>`) — a fully windowless run is not the supported path, and the driver **fails to start with no active macOS GUI login session** (issue #2176: ssh-only → "driver did not start up in time"; a logged-in, even screen-locked, GUI session is fine). This Mac qualifies; a future headless CI box would not without a GUI session.
- **Visual assertion:** `assertScreenshot` (CLI ≥ 2.2.0, runs locally — not Cloud-only). `takeScreenshot` creates baselines; both support `cropOn:` a selector.
- **AI assertions** (`assertWithAI`, `assertNoDefectsWithAI`): require Maestro Cloud auth (`MAESTRO_CLOUD_API_KEY`; free tier exists), are `optional: true` by default, and are nondeterministic — **not part of the gate**; at most an advisory lint pass.
- **odiff** (`odiff-bin` 4.5.0, npm): SIMD pixel differ, `odiff --fail-on-layout -t 0 base.png actual.png diff.png`, exit codes **0** match / **21** layout diff / **22** pixel diff, `--aa` ignores antialiasing, `--diff-mask`, `-i x1:y1-x2:y2` ignore-regions, `--parsable-stdout`. Node API `compare()` + `ODiffServer` resident mode. Faster than pixelmatch (~1s vs ~7.7s on large images) and CLI-first — chosen over pixelmatch (ESM-only lib, needs pngjs glue) for the post-run pass.

## The build under test (plan-changing finding)

The ticket says "expo-dev-client simulator build", but **do not point Maestro at the dev-launcher**. Verified reality:

1. Expo's official E2E guides use a dedicated **non-dev-client release-style simulator build** profile — `{"e2e": {"withoutCredentials": true, "ios": {"simulator": true}}}`, *no* `developmentClient: true`. No launcher screen, no Metro dependency, `launchApp` with the bundle ID just works.
2. The dev-client launcher otherwise sits in front of every launch; Maestro's own blog gets past it by *tapping through the launcher UI* with conditional flows (fragile), and cold-launch deep-linking into a dev build is explicitly unsupported (`expo-development-client` is a reserved path).
3. `launchApp` `arguments:` are unreliable on iOS anyway — booleans lose their `-` prefix and never reach UserDefaults (Maestro #2113, open), and expo-dev-client drops launch args on bundle reload (expo #31830).

**Decision:** the project still uses expo-dev-client for development, but the E2E loop builds an `e2e` profile: a release-mode **local** simulator build (`eas build --profile e2e --platform ios --local`, or `xcodebuild` after prebuild) with a compile-time flag (`EXPO_PUBLIC_E2E=1` env inlined at bundle time) that swaps every signal provider to its **fixture implementation** and mounts the E2E control surface. Rebuild only when native/JS code changes; flow edits never require a rebuild.

### Mock-state injection channel

The mocked signal boundary (SignalKit fixture `HealthProvider`, fixture DeviceActivity/ScreenTimeKit, fixture location/motion) lives **inside the app**; Maestro just has to select a scenario. Ranked channels:

1. **Deep link (primary):** the E2E build registers `excerlock://e2e/scenario/<name>?overrides=...`; the handler loads a named fixture scenario (bundled JSON: balances, HK sample sets with fixture `sourceRevision`s, armed monitors, day-boundary time, vendor states) into the mock boundary and re-renders. Maestro: `openLink: excerlock://e2e/scenario/steps-earned-5k`, with the documented `runFlow`/`when:` guard for iOS's one-time "Open in ExcerLock?" confirm. Deterministic, cold-launch-safe on a release build, and each flow's header documents its scenario.
2. **Maestro `http` → in-app control server (secondary, for mid-flow mutation):** the E2E build runs a localhost HTTP listener; flows call `http.post("http://localhost:8085/e2e/signal", ...)` from `runScript` to simulate *events during the flow* — "observer fired", "geofence entered", "drain tick" — i.e. the exact entry points the mock boundary owns (background wakes can't be produced on sim; we invoke the handler directly, per healthkit-coverage §mock-boundary item 3).
3. **`launchApp` `arguments:`** — strings-only fallback (`scenario: "steps-earned-5k"` read via launch args); avoid booleans (#2113). Use only if deep-link handling is ever broken.

## The agent loop

```
build (only if native/JS changed)
  └─ eas build --profile e2e --platform ios --local  →  ExcerLock.app
prepare simulator (once per session; erase only when state-poisoned)
  └─ simctl boot/install/status_bar/appearance   (§ lifecycle below)
run
  └─ maestro test e2e/flows \
       --include-tags=<scope> \
       --format junit --output e2e/out/report.xml \
       --test-output-dir e2e/out/artifacts --debug-output e2e/out/debug \
       --flatten-debug-output --udid $E2E_UDID --no-reinstall-driver
parse
  ├─ exit code: 0 = all flows passed, 1 = at least one failed
  ├─ report.xml (JUnit): per-flow <testcase name= file= status=> + <failure> text
  └─ e2e/out/artifacts/<flow>/: failing step's screenshot, view hierarchy,
     commands.json, device logs — the agent reads these before touching code
visual pass (after functional green)
  └─ odiff loop: baselines/<screen>.png vs artifacts capture → diff PNG + exit code
fix
  └─ agent edits app code or flow, decides: rebuild needed? (native/JS yes, YAML no)
rerun → until functional green AND visual green
```

Loop rules for the agent:

- **Functional first, visual second.** `assertScreenshot` steps are tagged out (`--exclude-tags=visual`) until the flow's functional assertions pass; pixel-noise failures on a functionally broken screen are wasted iterations.
- **Parse, don't rerun blind.** On failure, read the JUnit `<failure>` text, then the failing flow's artifact bundle (screenshot + view hierarchy). The hierarchy dump answers "wrong testID vs wrong render" without another run.
- **One scenario per flow file.** Flow header = scenario deep link; flows stay independently rerunnable: `maestro test e2e/flows/balance-drain.yaml` re-checks one fix in seconds.
- **Scope with tags.** `smoke` (launch + tab nav), per-surface tags (`home`, `manage`, `analysis`, `settings`, `shield-adjacent`), `visual` (screenshot gates), `wip`. Inner loop: `--include-tags=<surface>`; gate before commit: full suite.
- **Two failed fix attempts on the same flow → stop and reconsider** (protocol rule): re-read the scenario fixture and the PRD section before a third edit.
- **No JSON report format exists** (`--format` = JUNIT | HTML | HTML-DETAILED | NOOP); JUnit XML is the machine interface. There is also **no `--retries` flag** on local `maestro test` — retries are per-step (`retry` command, `maxRetries` ≤ 3) or the loop's own rerun.

## Visual-perfection gate

Two layers, same baselines directory (`e2e/baselines/<screen>.png`, git-committed):

**Layer 1 — in-flow (`assertScreenshot`)**: each screen's flow ends its visual section with

```yaml
- waitForAnimationToEnd          # default 15 s cap; never fails — pair with a real assert
- assertScreenshot:
    path: ../baselines/home-default.png
    thresholdPercentage: 99.5    # start; ratchet toward 100 once stable
```

`thresholdPercentage` defaults to 95.0 — far too loose for a "visually perfect" product; we start at 99.5 (absorbs undocumented antialiasing behavior in Maestro's differ) and ratchet per-screen toward 100 as each stabilizes. `cropOn:` scopes a capture to one component when a region is legitimately dynamic. Maestro generates a diff image on failure (location in local artifacts undocumented — confirm on first failing run).

**Layer 2 — post-run odiff sweep**: after functional green, a small script compares every `takeScreenshot` output in `e2e/out/artifacts` against `e2e/baselines/`, `--fail-on-layout -t 0 --aa`, writing `e2e/out/diffs/<screen>.png` masks. This is the **stricter, machine-readable** gate: exact exit codes (21/22), per-screen diff masks the agent opens directly, zero tolerance. Layer 1 catches regressions *inside* the run cheaply; layer 2 is the final "perfect" verdict.

**Determinism pinning (all mandatory — baselines are void without them):**

| Source of noise | Pin |
|---|---|
| Status bar clock/battery | `xcrun simctl status_bar $UDID override --time "9:41" --batteryState charged --batteryLevel 100 --dataNetwork wifi --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4` (apply **after** boot) |
| Light/dark | `xcrun simctl ui $UDID appearance light` (dark-mode baselines are a separate set, captured under `appearance dark`) |
| Device model / scale / runtime | One pinned sim: **iPhone 17 Pro, one pinned iOS runtime**, created by name for the loop; baselines never compared across models. Re-bless the whole set on macOS/Xcode/runtime upgrades (font rendering shifts). |
| Animations | Reanimated `<ReducedMotionConfig mode={ReduceMotion.Always}/>` mounted in the E2E build only (SWM docs recommend exactly this for tests) + `waitForAnimationToEnd` before every capture. `simctl spawn $UDID defaults write com.apple.Accessibility ReduceMotionEnabled 1` as belt-and-braces (community-verified, not Apple-documented). |
| Cursor blink | Never capture with a focused TextInput; `hideKeyboard`/blur first. |
| Live data / time-of-day UI | The scenario fixture pins the app clock (mock boundary owns "now") — day-boundary and balance displays render identically every run. |

**Baseline lifecycle:**

- **Create:** flow runs `takeScreenshot` (temporarily, or via a `bless` tag variant); agent verifies the PNG against the design spec (`design/STYLE.md`, dashboard build spec) **and Johan approves the first baseline of each screen** — a baseline is a design sign-off, not a test artifact.
- **Update:** only when a deliberate visual change lands. The bless script copies the current run's capture over the baseline **and the diff mask is attached to the commit/PR** so the change is reviewed as a diff, never silently. Agents never bless to make red go green; a red visual gate with no intended visual change is a bug, full stop.
- **Store:** PNGs in-repo (screens are small; if the set grows past ~50 MB, move to Git LFS — decision deferred).

## Flakiness mitigations

- Prefer `assertVisible` (auto-retries 7 s) and `extendedWaitUntil` over any fixed sleep; `waitForAnimationToEnd` before captures (remember: it never *fails*, so it's a settling aid, not an assertion).
- `retry` command (`maxRetries` ≤ 3) around genuinely racy steps only — docs explicitly call wrapping whole flows an anti-pattern; the agent loop is the flow-level retry.
- `MAESTRO_DRIVER_STARTUP_TIMEOUT=120000` (default 15 s) for cold XCTest-runner starts; `--no-reinstall-driver` on warm reruns.
- Keep **one** dedicated sim booted for the whole session (cold boots and parallel sims are the flaky path; known open issues with `--udid` against simctl-booted sims — #3248/#2628/#3012 — mean: boot once, verify `maestro list-devices` sees it, then reuse).
- Deterministic app state via scenario deep links + `clearState: true` launches; `simctl erase` only when state is poisoned (it's the slow path).
- RN-on-iOS selector caveat: nested touchables can swallow `testID`s — set `accessible={false}` on wrapping containers, `accessible={true}` on the target; every interactive element gets an explicit `testID` (this is a build-time convention for the app code, enforced from day one).
- One flow per scenario, no cross-flow state dependence; `executionOrder` never load-bearing.

## Simulator lifecycle (the loop's shell vocabulary)

```bash
# once: create the pinned device (name is the loop's contract)
xcrun simctl create "ExcerLock-E2E" "iPhone 17 Pro"          # newest runtime auto-picked; pin explicitly when several installed
E2E_UDID=$(xcrun simctl list devices --json | jq -r '.devices[][] | select(.name=="ExcerLock-E2E") | .udid')

# session start
xcrun simctl boot "$E2E_UDID"
open -a Simulator --args -CurrentDeviceUDID "$E2E_UDID"       # GUI session required by the Maestro driver anyway
xcrun simctl ui "$E2E_UDID" appearance light
xcrun simctl status_bar "$E2E_UDID" override --time "9:41" --batteryState charged --batteryLevel 100 \
  --dataNetwork wifi --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4
xcrun simctl privacy "$E2E_UDID" grant all <bundle-id>        # TBD; note: notifications not grantable via simctl on this macOS

# install / reinstall the build
xcrun simctl install "$E2E_UDID" path/to/ExcerLock.app

# manual poking outside Maestro
xcrun simctl launch --terminate-running-process "$E2E_UDID" <bundle-id>
xcrun simctl openurl "$E2E_UDID" "excerlock://e2e/scenario/<name>"
xcrun simctl io "$E2E_UDID" screenshot shot.png
xcrun simctl push "$E2E_UDID" <bundle-id> payload.json        # simulated push if ever needed

# reset ladder (cheap → nuclear)
xcrun simctl terminate "$E2E_UDID" <bundle-id>
xcrun simctl uninstall "$E2E_UDID" <bundle-id>
xcrun simctl shutdown "$E2E_UDID" && xcrun simctl erase "$E2E_UDID" && xcrun simctl boot "$E2E_UDID"
```

(`maestro start-device` exists but targets Maestro-Cloud-like devices; plain simctl + `--udid` is the controllable path for a pinned local device.)

## Physical-device smoke checklist (skeleton)

Simulator cannot run FamilyControls at all, can't produce real background wakes, real source attribution, or geofence/motion truth. The device suite is **manual-with-a-script**: a checklist the agent prints and Johan (or a future rig) walks on hardware. To be fleshed out by the §5 spike triad (device-activity-gaps §spikes); skeleton:

- [ ] **Shields:** picker → selection → `blockSelection` → shield shows on target app; survives force-quit; survives reboot. Shield copy/config per state (M7).
- [ ] **Shield CTA (G1):** shield button behavior on current iOS — `openUrl` hack vs notification tap-through; measure taps-to-app.
- [ ] **Background earn (spike 1):** workout on Watch / seeded HK write → phone locked → wake latency distribution → shield lifted without app open; force-quit variant (expect: no wake until manual open — confirm).
- [ ] **Mid-day re-arm (spike 2):** earn mid-interval → `includesPastActivity` continuity on iOS ≥ 17.4 and one pre-17.4 device; event-ladder ceiling probe (arm 200+ events); no double-fires across restarts.
- [ ] **Walk & Scroll (spike 3):** backdated-interval hack across target iOS versions; re-shield jitter at interval end; force-quit mid-session caps at one increment; reduced-drain ticks during session.
- [ ] **Drain ladder (G4):** 1-min tick accuracy vs real usage over a 30-min session; tick lag; balance display interpolation sanity.
- [ ] **Geofence:** gym-region enter/exit fires with app backgrounded and force-quit; cold-start relaunch on region cross.
- [ ] **Motion:** live walking verification (CoreMotion) on a real walk; pocket vs hand; treadmill.
- [ ] **HealthKit foreground staleness (G4/#330):** Watch workout → open app → claimable immediately?
- [ ] **Day boundary on-device:** boundary monitor fires with app unopened for 48 h.

Each item gets: device+iOS version, pass/fail, measured latency where relevant, into `docs/research/device-smoke-results.md` when the spikes run.

## Open items this research closes / leaves

**Closed:** harness choice (Maestro ≥ 2.7.0), build type under test (release-style E2E sim build, not dev-launcher), injection channel (deep link + in-app control server; not launch args), visual gate (assertScreenshot 99.5→100 + odiff zero-tolerance sweep), result interface (JUnit XML + artifact bundles), sim pinning rules.

**Left for the harness prototype ticket:** the odiff sweep script + bless script (`e2e/scripts/`), the E2E build profile + `EXPO_PUBLIC_E2E` wiring, the scenario-fixture schema (owned by the SignalKit design), localhost control-server port/API, confirming Maestro's local diff-image path, confirming `--time` status-bar override renders on the pinned runtime (known broken on iOS 16.1–16.4 era), and Git-LFS if baselines outgrow the repo.

## Sources

- Maestro docs (docs.maestro.dev, fetched 2026-07-28): install (`/maestro-cli/how-to-install-maestro-cli`), CLI commands/flags (`/maestro-cli/maestro-cli-commands-and-options`), env vars, test discovery/tags, reports/artifacts, and command references: `launchapp`, `openlink`, `takescreenshot`, `assertscreenshot`, `waitforanimationtoend`, `extendedwaituntil`, `retry`, `runflow`, `runscript`, `evalscript`, selectors, conditions, parameters, JS/HTTP (`/maestro-flows/javascript/*`), AI analysis, React Native page.
- Maestro repo (github.com/mobile-dev-inc/maestro): releases cli-2.7.0/2.6.1/2.6.0 + CHANGELOG; source verified for exit codes (`TestCommand.kt`), JUnit shape (`JUnitTestSuiteReporter.kt`), Simulator.app launch (`LocalSimulatorUtils.kt`); issues #2176 (GUI-session requirement), #2113 (iOS bool launch args), #2496, #2192, #3248/#2628/#3012 (booted-sim `--udid` hangs), #2103, #762 + #1222 (visual-assert lineage); maestro.dev/blog/visual-testing (2026-03-02), maestro.dev blog on Expo dev builds.
- Expo docs: E2E workflows guide (`docs.expo.dev/eas/workflows/examples/e2e-tests/`), E2E tutorial (`/tutorial/cicd/e2e-tests/`), pre-packaged jobs (`type: maestro` schema), development workflows (dev-client deep-link limits, `disableOnboarding=1`); expo/expo#31830 (dev-client drops launch args).
- Local verification on this Mac (macOS 26.5.2): `maestro --help` (2.6.1 binary), `xcrun simctl help` (full subcommand/flag list incl. `status_bar`, `ui`, `privacy` service list, `io screenshot`).
- odiff (github.com/dmtrKovalenko/odiff, odiff-bin 4.5.0 `--help` run live); pixelmatch 7.2.0 README; Reanimated `ReducedMotionConfig` docs (docs.swmansion.com); jessesquires.com + iosdev.recipes on `status_bar override`; fastlane#21255 (`--time` broken on iOS 16.1–16.4 runtimes); xcresulttool man page + Apple forums 763888 (XCUITest result parsing).
- Repo: `excerlock-app-prd.md` §3, §5; `docs/research/healthkit-coverage.md` (mock boundary); `docs/research/device-activity-gaps.md` (spike triad).
