# ExcerLock e2e harness — the test-fix loop

> **Ticket #15 · DRAFT for Johan's reaction.** Inputs: `docs/research/e2e-loop.md`
> (#20 — all toolchain facts verified there; this doc is the operational contract,
> that doc is the rationale), `ARCHITECTURE.md` (fixture-timeline format §4,
> debug-menu composition root D5), wayfinder map #1 (locked strategy: simulator
> loop with mocked signal boundary + Maestro until functionally *and* visually
> perfect; physical-device smoke suite for shields/geofence/motion).
>
> The app does not exist yet. Everything marked **TBD** resolves when the app
> scaffold lands (Phase 0–2); the loop definition itself is final-shape.

---

## 1. What the harness is

Agents drive `maestro test` against a **release-style e2e simulator build** (EAS
profile `e2e`: `withoutCredentials` + `ios.simulator: true`, **no**
`developmentClient`; `EXPO_PUBLIC_E2E=1` inlined at bundle time swaps every
SignalKit provider to its fixture implementation and mounts the E2E control
surface). Flows select deterministic app state via scenario deep links
(`excerlock://e2e/scenario/<name>`) and mutate it mid-flow via the in-app
control server — both defined in `e2e/scenario-schema.md`. The loop reruns
until **functional green AND visual green**, on one pinned simulator, with
every noise source pinned (§6).

Never point Maestro at the expo-dev-client launcher, and never pass boolean
`launchApp` arguments (both broken paths — e2e-loop.md §build-under-test).

```
e2e/
  HARNESS.md           ← this contract
  scenario-schema.md   ← scenario/fixture/control-server schema
  README.md            ← orientation + tag vocabulary
  flows/               one flow per scenario (smoke-home.yaml is the template)
  scenarios/           scenario manifests (bundled into the e2e build)
  baselines/           blessed per-screen PNGs — each one is a design sign-off
  scripts/             run-suite.sh · visual-sweep.sh · bless-baseline.sh
  out/                 gitignored: report.xml, artifacts/, debug/, diffs/, visual-results.tsv
```

---

## 2. The loop driver contract

The loop an agent runs, in full:

```
0. build          only if native/JS changed since the installed build:
                    eas build --profile e2e --platform ios --local → ExcerLock.app
                    xcrun simctl install "$E2E_UDID" ExcerLock.app
1. session start  once per session: boot + pin the simulator (§6 checklist)
2. run            scripts/run-suite.sh [--tags <scope>]        # visual steps excluded by default
3. parse          exit code → report.xml → failing flows' artifact bundles
4. classify       every failure is exactly one of: FUNCTIONAL | VISUAL | FLAKE  (§2.3)
5. fix            edit app code or flow YAML; decide rebuild (native/JS yes, YAML no)
6. rerun          the single fixed flow first (seconds), then the scoped suite
7. visual pass    after functional green: run-suite.sh --with-visual, then
                  scripts/visual-sweep.sh                      # the final verdict
8. repeat 2–7 until run-suite exit 0 AND visual-sweep exit 0
```

### 2.1 Run interface

`scripts/run-suite.sh` wraps the canonical invocation:

```
maestro test e2e/flows \
  --include-tags=<scope> --exclude-tags=visual,wip \
  --format junit --output e2e/out/report.xml \
  --test-output-dir e2e/out/artifacts --debug-output e2e/out/debug \
  --flatten-debug-output --udid $E2E_UDID --no-reinstall-driver
```

Machine interface (there is **no JSON report format** and **no `--retries`**
flag — JUnit XML is it):

- **Exit code:** `0` all flows passed · `1` ≥ 1 flow failed.
- **`out/report.xml`:** per-flow `<testcase name= file= status=>`; failures
  carry a `<failure>` text node — read this first.
- **`out/artifacts/<flow>/`:** the failing step's screenshot, **view-hierarchy
  dump**, `commands.json`, `logs/`, device logs. The hierarchy dump answers
  "wrong testID vs wrong render" without another run. **Parse, don't rerun
  blind.**

### 2.2 Scoping

Inner loop: `--tags <surface>` (`home` / `manage` / `analysis` / `settings` /
`shield-adjacent`). Quick sanity: `--tags smoke`. Gate before any commit: the
full suite, then the visual pass. One scenario per flow file, no cross-flow
state dependence, so `run-suite.sh --flow flows/<one>.yaml` re-checks one fix
in seconds.

### 2.3 Failure classification

Every red flow gets exactly one label before any fix is attempted:

| Label | Evidence | Action |
|---|---|---|
| **FUNCTIONAL** | `<failure>` on a non-screenshot assertion: element not found, wrong text, timeout on `assertVisible`/`extendedWaitUntil`, crash in device logs | Read artifact bundle → fix app code or flow → rerun that flow |
| **VISUAL** | `assertScreenshot` step failed, or `visual-sweep.sh` reports `LAYOUT_DIFF`/`PIXEL_DIFF` | Open the diff mask (`out/diffs/<screen>.png`). Unintended render change → it's an app bug, fix it. Intended change → **STOP**, baseline workflow (§3) — the loop never blesses |
| **FLAKE** | Fails in the suite but passes when the single flow is rerun in isolation; or driver-startup / `kAXErrorInvalidUIElement`-class errors; or a known-issue signature (e2e-loop.md §flakiness) | Record it, apply a mitigation (prefer `assertVisible`/`extendedWaitUntil` over sleeps; `retry maxRetries≤3` around the single racy step only — never whole flows), do **not** count it as a fix attempt |

Classification rules:

- A failure is only FLAKE after **one** isolated rerun proves it
  non-reproducible. Two suite failures of the same flow with green isolated
  reruns → treat the flake as real (usually cross-flow state leaking or sim
  poisoning; go to the reset ladder §6.3).
- **Functional first, visual second.** Visual steps stay excluded
  (`--exclude-tags=visual`) until the flow's functional assertions pass;
  pixel-failures on a functionally broken screen are wasted iterations.
- **Two failed fix attempts on the same flow → stop** (standing protocol
  rule): re-read the scenario manifest, the fixture timelines it references,
  and the relevant PRD section before a third edit. If still stuck, escalate
  to Johan with the artifact bundle attached.

### 2.4 What the loop may and may not touch

| The loop MAY | The loop MUST NOT |
|---|---|
| Edit app code, flow YAML, scenario manifests, fixture timelines | Bless or modify anything in `baselines/` — that is `bless-baseline.sh` + Johan, always (§3) |
| Rerun, rebuild, reinstall, reset the sim (ladder §6.3) | Loosen a `thresholdPercentage` that has already been ratcheted up (§4.1) |
| Add/adjust flake mitigations per §2.3 | Mark a visual failure "expected" in a flow to skip the gate |
| Propose a baseline update with the diff mask attached | Delete or `.gitignore` diff masks / results files to make a pass look clean |

A red visual gate with no intended visual change is a bug, full stop. Agents
never bless to make red go green.

---

## 3. Baseline-approval workflow

A baseline is a **design sign-off, not a test artifact**. Two paths, both
through `scripts/bless-baseline.sh`, which refuses to run without an explicit
approval flag:

**First capture (`bless-baseline.sh --first <screen>`):**
1. The flow captures the screen (`takeScreenshot: <screen>` after
   `waitForAnimationToEnd`, on the pinned sim, all pins from §6 applied).
2. Agent verifies the PNG against `design/STYLE.md` + the dashboard build spec
   and posts it for Johan.
3. **Johan approves the image itself.** Only then `--first` copies it into
   `baselines/<screen>.png`, and it's committed with a message naming the
   sign-off.

**Update (`bless-baseline.sh --reviewed <screen>`):**
1. A deliberate visual change lands; the sweep goes red — expected.
2. Agent runs `visual-sweep.sh`, opens `out/diffs/<screen>.png`, and posts the
   diff mask for Johan.
3. **Johan reviews the diff.** Only then `--reviewed` copies the new capture
   over the baseline **and stages the diff mask at
   `baselines/.review/<screen>.diff.png`** so the commit/PR carries the
   reviewed diff — a baseline never changes silently.

Storage: PNGs in-repo. If the set grows past ~50 MB, move to Git LFS
(decision deferred — flag it, don't decide it). Whole-set re-bless is required
after macOS/Xcode/iOS-runtime upgrades (font rendering shifts, §6) — that is a
Johan-scheduled event, not a loop action.

---

## 4. Visual gate config

Two layers, one baselines directory. Layer 1 is the cheap in-run regression
catch; layer 2 is the final "perfect" verdict.

### 4.1 Layer 1 — in-flow `assertScreenshot` (ratchet 99.5 → 100)

Each screen's flow ends its visual section with:

```yaml
- waitForAnimationToEnd        # settling aid only — it never fails
- assertScreenshot:
    path: ../baselines/home-default.png
    thresholdPercentage: 99.5  # start; ratchet per-screen toward 100
```

Ratchet law: every screen starts at **99.5** (absorbs Maestro's undocumented
antialiasing behavior). Once a screen passes at its current threshold for
**three consecutive full-suite runs**, raise it (99.5 → 99.9 → 100). A
threshold never goes back down; if a raised threshold fails, that's a VISUAL
failure to fix, not a knob to turn. `cropOn:` scopes the capture when one
region is legitimately dynamic — cropping is the sanctioned tool, thresholds
are not. Tag every screenshot step `visual`.

### 4.2 Layer 2 — odiff zero-tolerance sweep

After functional green and a `--with-visual` run, `scripts/visual-sweep.sh`
compares **every** capture in `out/artifacts` against `baselines/`:

```
odiff --fail-on-layout -t 0 --aa <baseline> <capture> out/diffs/<screen>.png
```

Exit codes are the machine interface: `0` match · `21` layout diff ·
`22` pixel diff. The sweep writes one TSV row per screen to
`out/visual-results.tsv` (`MATCH | LAYOUT_DIFF | PIXEL_DIFF | MISSING |
NO_BASELINE | ERROR`) and exits non-zero if anything is not `MATCH`. Zero
tolerance, no thresholds — this layer is why the ratchet can take its time.
A capture with no baseline (`NO_BASELINE`) fails the sweep too: an unsigned
screen is not a shippable screen (override with `--allow-unblessed` during
early bring-up only).

**TBD on first failing run:** confirm where Maestro writes its own
`assertScreenshot` diff image locally (undocumented) and note it here.

---

## 5. Rebuild decision

| Changed | Rebuild? |
|---|---|
| Flow YAML, scenario manifest, fixture timeline JSON | **No** — rerun immediately |
| App TS/JS code | **Yes** — JS is inlined at bundle time in the e2e profile (no Metro) |
| Native code, config plugins, patches, pods | **Yes** — full `eas build --profile e2e --local` |

---

## 6. Determinism pinning checklist

All mandatory — **baselines are void without every pin applied**. `run-suite.sh`
refuses to run against an unbooted sim precisely so these can't be skipped.

### 6.1 Session start (once per session, in order)

- [ ] One pinned device exists: `xcrun simctl create "ExcerLock-E2E" "iPhone 17 Pro"`
      — one model, one pinned iOS runtime, created by name; baselines are never
      compared across models/runtimes.
- [ ] `xcrun simctl boot "$E2E_UDID"` then
      `open -a Simulator --args -CurrentDeviceUDID "$E2E_UDID"` (the Maestro
      driver needs a live macOS GUI session anyway — headless boxes need not apply).
- [ ] Appearance: `xcrun simctl ui "$E2E_UDID" appearance light`
      (dark baselines are a **separate set**, captured under `appearance dark`).
- [ ] Status bar (**after** boot):
      `xcrun simctl status_bar "$E2E_UDID" override --time "9:41" --batteryState charged --batteryLevel 100 --dataNetwork wifi --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4`
      — **TBD:** confirm `--time` renders on the pinned runtime (known broken on
      iOS 16.1–16.4-era runtimes).
- [ ] Permissions: `xcrun simctl privacy "$E2E_UDID" grant all <bundle-id>`
      (bundle id TBD; notifications are not grantable via simctl on this macOS).
- [ ] Reduce motion, belt-and-braces:
      `xcrun simctl spawn "$E2E_UDID" defaults write com.apple.Accessibility ReduceMotionEnabled 1`.
- [ ] `maestro list-devices` sees the booted device before the first run.
- [ ] `MAESTRO_DRIVER_STARTUP_TIMEOUT=120000` exported (cold XCTest-runner
      starts blow the 15 s default); `--no-reinstall-driver` on warm reruns.

### 6.2 In-app / in-flow pins

- [ ] The e2e build mounts Reanimated
      `<ReducedMotionConfig mode={ReduceMotion.Always}/>` (E2E build only).
- [ ] The scenario fixture pins the app clock — the mock boundary owns "now"
      (`clock.now` in the manifest, `scenario-schema.md` §3); day-boundary and
      balance displays render identically every run.
- [ ] `waitForAnimationToEnd` before every capture, always paired with a real
      assertion.
- [ ] Never capture with a focused TextInput — `hideKeyboard`/blur first
      (cursor blink).
- [ ] Flows launch with `clearState: true` and load their scenario via deep
      link; `executionOrder` is never load-bearing.

### 6.3 Reset ladder (cheap → nuclear; erase is the slow path, use it only when state-poisoned)

```
xcrun simctl terminate "$E2E_UDID" <bundle-id>
xcrun simctl uninstall "$E2E_UDID" <bundle-id>       # then reinstall the build
xcrun simctl shutdown "$E2E_UDID" && xcrun simctl erase "$E2E_UDID" && xcrun simctl boot "$E2E_UDID"
                                                     # then redo ALL of §6.1
```

Keep the one sim booted for the whole session — cold boots and parallel sims
are the flaky path (known `--udid` hangs against freshly-booted sims).

---

## 7. Physical-device smoke checklist

Simulator cannot *complete FamilyControls authorization* (the frameworks do run — see `docs/research/familycontrols-on-simulator.md`), real background wakes, real source
attribution, or geofence/motion truth. The canonical, executable milestone gate
is now [`DEVICE-SMOKE.md`](DEVICE-SMOKE.md); its append-only run record is
[`DEVICE-SMOKE-RESULTS.md`](DEVICE-SMOKE-RESULTS.md). It supersedes the generic
DS-1..DS-10 draft that was previously in this section and incorporates the
exact unproven items reported by tickets #79–#83. Run the full checklist at
each native milestone and before submission. `BLOCKED` and `NOT RUN` never
count as passes.

---

## 8. Open / TBD register

- `APP_BUNDLE_ID`, `.app` path, deep-link scheme registration — land with the
  app scaffold; placeholders sit at the top of every script.
- E2E build profile + `EXPO_PUBLIC_E2E` wiring in `eas.json`/app config —
  Phase 0–2 work, spec'd in e2e-loop.md.
- Maestro local diff-image path (§4.2) and `status_bar --time` on the pinned
  runtime (§6.1) — confirm on first real runs, record here.
- Git LFS for `baselines/` if > ~50 MB (§3).
- `assertWithAI`/`assertNoDefectsWithAI`: **not part of the gate**
  (nondeterministic, Cloud-auth). At most a manually-triggered advisory lint —
  revisit only if Johan wants it.
