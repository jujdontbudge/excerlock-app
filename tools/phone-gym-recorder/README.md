# Gym Recorder — gym-location ground-truth lab app

A standalone, local-only iPhone app for finding out whether the ExcerLock gym
path detects the right states: you set the gym circle, walk/drive in and out,
tap where you are, and the archive records what iOS delivered next to what you
saw in ExcerLock.

- Bundle ID: `com.johansardar.excerlock.lab.gymrecorder` (from the one identity
  owner, `app-next/plugins/linkedRecorderResearchConfig.js`)
- Production bundle ID: `com.johansardar.excerlock` (untouched, not overwritten)
- Storage: this app's own sandbox only; no App Group, no URL scheme, no
  Trace Lab handshake
- Networking: none; no uploads, no accounts, no map tiles
- Delivery: existing Apple Development signing and direct connected-device
  install only (never `-allowProvisioningUpdates`)
- Permissions: Location "While Using"/"Always" and Motion & Fitness
- One deliberate difference from the Walking Recorder: this app declares the
  `location` background mode, because background geofencing *is* the thing under
  test. Without it, S04, S13, S18 and S24 could not be judged.
- Coordinates are recorded on purpose. Unlike ExcerLock (which stores no
  coordinates) this archive contains raw positions and the registered circle;
  it stays in the app sandbox, protected, until you pull or share it.

## On the phone

### 1. Before a session

Open **Gym Recorder**. The Home screen is one scrolling page:

1. **Permissions** — **Allow location** (While Using), then **Allow Always in
   Settings** for the auto-detect scenarios, and **Allow Motion**. Recording is
   deliberately allowed under *any* permission state, because S14–S16 exist to be
   judged; the card only tells you what the current capture can prove.
2. **The circle under test** — stand at the gym entrance and tap **Set gym here**
   (it averages 20 s of fixes, rejects fixes worse than 65 m), or **Type
   coordinates**. The radius steps 50–200 m in 10 m and defaults to 100 m, the
   same clamp and default the app uses.
3. **ExcerLock setup (tap once per session)** — the four declarations
   (same gym saved, auto-detect, permission, precise location) plus which build
   you are testing. These are your declarations: this app cannot read ExcerLock.
4. **What are you testing?** — pick a script (the table below). Choosing one shows
   its steps; **Free session** is at the top for anything unscripted.
5. **Where are you right now?** — start as **Away** unless you begin inside.
6. Tap **Start recording**.

### 2. While recording

- **Status header** — big **INSIDE / OUTSIDE / UNKNOWN** (the same region presence
  ExcerLock sees), the live distance and accuracy to the circle, what the ported
  reducer is doing (`confirming 12 s`, `confirmed 03:41`, `idle`), the activity
  (`walking · 96 spm`, `automotive`, `stationary`) and a dot for whether your own
  location stream is live.
- **Script strip** — the current step and the one tap it expects.
- **Place cards** — exactly one active, radio-style: **I'm in the gym** · **In the
  circle, not in the gym** (car park, entrance, café) · **On the boundary line** ·
  **Passing by, not stopping** · **Away**. One tap is one boundary.
- **ExcerLock shows…** — tap **Card: At gym / Not at gym / Confirming / No card /
  Can't tell** and **Locked app: Opened / Blocked / Can't tell** when you glance at
  ExcerLock. Opened a locked app on purpose? Tap the canary row (**It opened** /
  **It was blocked** / **Not sure**) — that is the strongest production evidence.
- **Actions** — **Probe check-in** (mirrors the production manual check-in with one
  fresh fix), **Probe re-register** (S17), **I did this in ExcerLock…** (permission
  changed, force quit, relaunched, rebooted, auto-detect toggled, manual check-in),
  **Oops, I forgot a tap** (a boundary placed at now − 30 s/1/2/5 min, marked
  *approximate*), **Add a note**.
- **Finish & save** — tap **Done** on strip steps that have no place change.

A plain arrival-and-leave costs three taps: *I'm in the gym* on the way in,
*Away* on the way out, **Finish & save**.

### 3. The 25 scripts

| Id | What you do | Taps you owe the strip |
|---|---|---|
| S01 | **Register the gym** — stand at the entrance, Set gym here, save the same circle in ExcerLock. | Setup only: no place taps. |
| S02 | **Arrive on foot** — start ≥ 300 m away, walk in. | Away → I'm in the gym (at the desk). |
| S03 | **Stay there** — stay in_gym ≥ 20 min. | In_gym, plus two *ExcerLock shows…* taps. |
| S04 | **Use another app while there** — 5 min in another app, 5 min locked, then return. | In_gym + **Done** on the three switch/lock/return steps. |
| S05 | **Leave** — walk out ≥ 300 m. | Away when clearly outside. |
| S06 | **Leave and return** — S05 then walk back in. | Away, then I'm in the gym. |
| S07 | **Oscillate** — cross the edge 6 times, ~1 min apart. | In the circle, not in the gym ↔ Away six times. |
| S08 | **Hover at the edge** — stand on the boundary line for 5 min. | On the boundary line. |
| S09 | **Brief pass-by** — through a 100 m circle without stopping (< 30 s). | Passing by, not stopping → Away. |
| S10 | **Drive-by** — same by car (≈5–10 s inside). | Passing by, not stopping → Away. |
| S11 | **Arrive by vehicle, park inside, walk in.** | In the circle, not in the gym (parked) → I'm in the gym. |
| S12 | **Poor indoor accuracy** — 15 min deep inside with the phone in a locker/bag. | In_gym. |
| S13 | **App killed and relaunched** — force-quit ExcerLock while inside, wait 3 min, relaunch, then leave. | In_gym, the two ExcerLock action acks, Away — report as a finding. |
| S14 | **When In Use only**, auto-detect off — S02 script, then tap *Check in* in ExcerLock. | Declaration ack, In_gym, manual check-in ack, then **Probe check-in**. |
| S15 | **Location denied** — S02 script. | Declaration ack, In_gym. |
| S16 | **Precise location off** — S02 script (repeat with the harness's own precise off). | Declaration ack, In_gym. |
| S17 | **Permission granted after arrival** — arrive denied, grant Always in Settings while inside. | In_gym, permission-changed ack, **Probe re-register**. |
| S18 | **Screen locked during arrival** — lock the phone 200 m out, walk in locked, unlock at the desk. | Away before locking, I'm in the gym at the desk (backdating allowed). |
| S19 | **Three visits in one day**, ≥ 30 min apart. | In_gym / Away three times. |
| S20 | **Day/session boundary** — set ExcerLock's boundary near now and stay across it. | In_gym + a **note** with the boundary time. Report as a finding. |
| S21 | **Two overlapping circles** — stand in the overlap. | In_gym. |
| S22 | **Airplane mode** — S02 with Wi-Fi and cellular off. | Away → I'm in the gym. |
| S23 | **Low Power Mode on** — S02 + S05. | Away → I'm in the gym → Away. |
| S24 | **Reboot while inside** — reboot, unlock, reopen the harness, then leave. | In_gym, reboot ack, Away. Report as a finding. |
| S25 | **Free session** — anything. | Whatever happens; descriptive only. |

Numeric expectations live in `Fixtures/EXPECTED.json` (also shipped in the app
bundle), so the phone and the validator read one file. The constants the app must
mirror are in `Sources/RecorderModels.swift` and the production reducer in
`app-next/src/domain/gymMachine.ts`.

## Capture archive

Each session is one `<uuid>.gymcapture` directory in the app's Documents, exported
as `gym-capture-<session-id>.zip`:

| File | Content |
|---|---|
| `raw-location.ndjson` | Every delivered `CLLocation`, region monitoring lifecycle, region enter/exit, authorization/accuracy changes, monitoring errors, suspensions. Region events say `sourceTime=unavailable_receipt_only`: receipt time is never the crossing time. |
| `raw-motion.ndjson` | Core Motion activity classification and pedometer cadence/steps — arrival mode and "seated in the car park" vs "walked in", no inertial streams. |
| `labels.ndjson` | Your ground truth: scenario declaration, one active place at a time, scripted-step acks, backdated corrections with their declared offset, free-text notes. |
| `observations.ndjson` | What you saw in ExcerLock (card, locked app, canary) and your setup declarations. Human observation, never sensor truth. |
| `decisions.ndjson` | The Swift port of the production reducer fed by this app's own region events, per-fix sampled distance/accuracy band, manual check-in probes. Intended decisions, never claimed enforcement. |
| `system.ndjson` | Session, permissions, lifecycle, recording gaps, `location_stream_suspended`/`location_stream_coverage`, Low Power Mode, clock mapping, recovery. |
| `gym.json` | The registered circle(s): id, name, centre, radius, how it was set, averaged accuracy, fixes averaged. |
| `metadata.json` | Build/source commit, device, permissions at start, the production parity constants this build mirrors. |
| `schema.json` | Field/time-base/unit guide. |
| `manifest.json` | Completion status, duration, counts, per-stream first/last receipts, suspensions, per-label-window coverage, scenario id, gym ids and the reducer intervals held at finish. |
| `README.txt` | The two cautions above, inside the archive. |
| `recovery.json` | Protected checkpoint, never exported. |

Every event carries one shared `sequence`, `mach_continuous_time` receipt
nanoseconds, a receipt wall clock and ISO-8601, and `payload`. Source clocks keep
their own names inside the payload (`sourceWallTimeMs`).

## Pulling and validating an archive

Pull the directory straight out of the app container (no share sheet needed) and
run the validator:

```sh
DEVICE=F4E839C0-3F05-5BF8-BA31-12949B2B83AB     # "Il"
xcrun devicectl device copy from --device "$DEVICE" \
  --domain-type appDataContainer \
  --domain-identifier com.johansardar.excerlock.lab.gymrecorder \
  --source Documents/GymRecorderSessions/<session-id>.gymcapture \
  --destination ./pull/<session-id>.gymcapture

python3 tools/phone-gym-recorder/validate.py \
  --capture ./pull/<session-id>.gymcapture \
  --output ./out/<session-id>
```

`validate.py` accepts the expanded directory or the exported zip. It prints, in
order: the session header (scenario, device, circle, permission, ExcerLock
declaration, coverage), the timeline, the per-window table

```
scenario  window                    label      ref-state                FP s   FN s uncertain s flaps  verdict
S02       12:04:11→12:31:40         in_gym     confirmed @12:05:02        0      0          15     0  PASS · detect enter +21 s, confirm +51 s · release unmeasured
```

then the production-layer comparison (your card/lock observations against the
reference at that instant: `agree`, `production_lags`, `production_leads`,
`unknown`), the **cannot be judged** list and the **findings** — facts that are
not pass/fail (exit never delivered, spurious exits with their accuracy,
confirmation completed before the in_gym label, slow latencies, Low Power Mode,
a manifest coverage mismatch). It writes `verdict.json`, `timeline.csv` and
`distance.csv` into `--output`.

Scoring rules, in one paragraph: a confirmed interval while the label is `away`
or `passing_by` is a **false positive**; an `in_gym`/`in_circle_not_gym` window
with no confirmed interval is a **false negative** (flagged as a failure from
5 minutes up). The first 30 s + 15 s of an `in_gym` window are not counted (that
is the confirmation itself), every human boundary carries ±15 s of uncertainty
(the whole declared span for a backdated boundary), only
location-covered seconds are scored, and `on_boundary` is reported as boundary
behaviour instead of being forced to a verdict. The scenario FAILs when there is
real FP time, a pass-by that confirmed, or a long in_gym window with no
confirmation; latency thresholds (`>180 s` detection, `>600 s` release) are
informational flags, not failures. Exit 0 always means "the archive is valid";
only a malformed archive exits non-zero, and it never guesses a blank —
unjudgeable scenarios are listed with their reason.

Add `--trace <tracelab.ndjson>` when a Trace Lab export with gym events exists;
until then the column prints `no_trace`.

## Tests

```sh
cd tools/phone-gym-recorder

# archive/reducer/label/catalogue suites (simulator)
xcodebuild -project PhoneGymRecorder.xcodeproj -scheme PhoneGymRecorder \
  -destination 'platform=iOS Simulator,id=E1ACDE04-5761-4DF1-A2A5-C3159A5A6510' \
  -derivedDataPath DerivedData CODE_SIGNING_ALLOWED=NO test

# host-side recovery harness, no simulator
./scripts/test-recovery.sh

# the validator's own rules
python3 -m unittest test_validate

# the Swift port against the real reducer
npx tsx tools/phone-gym-recorder/scripts/verify-production-parity.ts

# the isolation guardrail
npx vitest run --config guardrails/vitest.config.ts guardrails/phone-gym-recorder-boundary.test.ts
```

The simulator proves the archive contract, the label clock, coverage accounting,
the scenario catalogue, recovery and the port; it cannot prove live Core
Location delivery, iOS region latency or the ExcerLock layer. Those exist only on
the phone, and the phone proof is S01 + S02 + S05 once, pulled and validated.

## Build, install, and the one thing that needs a person

```sh
cd tools/phone-gym-recorder
xcodegen generate
SOURCE_COMMIT="$(git rev-parse HEAD)"
xcodebuild -project PhoneGymRecorder.xcodeproj -scheme PhoneGymRecorder \
  -configuration Release -destination 'generic/platform=iOS' \
  -derivedDataPath /private/task/path/DerivedData-device \
  RECORDER_SOURCE_COMMIT="$SOURCE_COMMIT" \
  DEVELOPMENT_TEAM=AX3C2B78YD CODE_SIGN_STYLE=Automatic \
  'CODE_SIGN_IDENTITY=Apple Development' build

xcrun devicectl list devices            # expect "Il" iPhone 13, F4E839C0-3F05-5BF8-BA31-12949B2B83AB
xcrun devicectl device install app --device F4E839C0-3F05-5BF8-BA31-12949B2B83AB \
  /private/task/path/DerivedData-device/Build/Products/Release-iphoneos/PhoneGymRecorder.app
```

Signing uses the existing Apple Development identity and the wildcard team
profile that already signs the walking recorder; the location background mode is
an Info.plist key, not an entitlement. If the profile cannot sign this bundle,
stop and report that blocker instead of creating signing assets. Verify the
install with `devicectl` before claiming anything: a successful build is not an
install.

## Honest limits

- **This app is an equivalent observer, not ExcerLock.** Two apps monitoring the
  same circle get independent callbacks from the same system engine; they should
  agree within seconds, but nothing here proves what iOS told *ExcerLock*, when
  Task Manager ran, or whether the 30 s confirmation settled headlessly. That
  needs a gym trace in Trace Lab.
- **iOS region internals are invisible.** Latency, the hysteresis around the
  boundary, assisted determination and why a transient crossing did or did not
  produce an event are not observable; the archive records timing and accuracy so
  you can see the effect, never the cause.
- **A person is required.** Every scenario needs a real walk/drive and one-tap
  ground truth with ±15 s of human uncertainty, and the ExcerLock layer is your
  eyes on the card and a locked app.
- **This app cannot force ExcerLock states.** Permission changes, auto-detect,
  force-quit and reboot are done by you and self-reported.
- **No map, on purpose.** The circle is set by standing there or typing
  coordinates, so the lab needs no network; plots come from `distance.csv`.
