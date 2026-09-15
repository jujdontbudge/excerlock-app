# Walking Recorder — personal iPhone lab app

A standalone, local-only iPhone companion for collecting labeled walking and phone-motion evidence. This is **not** a screen in ExcerLock, not an Expo app, and not eligible for Expo OTA delivery.

- Bundle ID: `com.johansardar.excerlock.lab.walkingrecorder`
- Production bundle ID: `com.johansardar.excerlock` (unchanged)
- Storage: this app's own sandbox only; no App Group or production database
- Delivery: existing Apple Development signing and direct connected-device install only
- Networking: none; no uploads or accounts
- Permissions: live Motion & Fitness only
- Never collected: microphone, camera, raw GPS/location, Health history, advertising/device identifiers

## On-phone guide

1. Open **Walking Recorder**. The first time, tap **Allow Motion & Fitness**, then approve the honest iOS prompt.
2. Tap the large card matching what you are doing:
   - **I'm walking now**
   - **I'm on the treadmill** (phone in hand)
   - **I'm shaking the phone** (while seated)
   - **I'm sitting normally**
3. Tap that same active card when you are not doing it anymore. Sensor capture continues in a clearly marked **unlabeled transition**; transition time is never silently called stationary.
4. If you move straight to another activity, tap its card. One boundary atomically ends the old label and starts the new label, so labels cannot overlap.
5. Tap **Finish & Save**. The session appears under **Saved on this phone**.
6. Tap **Share archive** to use the normal iOS share sheet. Export before using the trash button if the session matters.

Keep the recorder screen open. The display stays awake during a recording. The companion intentionally has no location/background keep-alive, so iOS may suspend live callbacks if another app opens or the phone locks. On return, the interface and archive report observed lifecycle/sample gaps; they do not invent an exact suspension timestamp.

Recording health, unavailable streams, denied permission, sensor errors, the 250 MB per-session limit, the 750 MB local-retention limit, and low disk space are visible. The app never reports a successful capture when the production-path motion inputs are unavailable.

## Linked ExcerLock research session (started from Trace Lab)

A linked test starts in the separately provisioned **ExcerLock Trace Lab** build, which mints the session UUID and the 256-bit one-time nonce and opens this app with `excerlock-walkingrecorder://linked-session`. This app registers that one lab-only scheme and no production link, remains unentitled, and has no App Group, Family Controls, Managed Settings, background mode, OTA or network access.

1. In Trace Lab tap **Start test**. Walking Recorder opens and starts recording that test immediately, with no activity label yet.
2. Tap the card for what you are doing. Labels stay the honest foreground ground truth and live only in this app; the two apps exchange no live labels.
3. Answer the **Canary check** card inline: while walking (ExcerLock releases the shield while the walk is live, so the canary should open), then after standing still for a full minute past the stop grace (the shield should be back). Each answer is one tap and is recorded as the operator-observed outcome.
4. Tap **Finish test**. The archive is saved locally and this app returns to Trace Lab with the one-time link so Trace Lab can save its own trace file.

The recorder parses the lab-only `excerlock-walkingrecorder://linked-session` link; the research bundle remains the single owner of that link's builder, so this app cannot drift from it. The nonce is written transactionally only to the session's protected `recovery.json`, which is excluded from every archive export. Completion, interruption, storage-limit, sensor-error and process-termination paths keep that link, so the neutral **Linked test recorded here** card can always return to Trace Lab. That card never claims what Trace Lab did — Trace Lab does not report back whether it saved or cancelled, so the copy says so and offers **Open Trace Lab** to save or check. The one neutral **Remove this reminder** action carries an inline confirmation that it must be used only after Trace Lab has saved or cancelled the test; removing the reminder never touches the recording archive. When several recoveries are pending, the card picks them deterministically: an unfinished recording first, then the newest started test, with the session id as the tie-break, so an already-finalized archive can never hide the test just run. Every pending recovery protects its own archive, not only the one the card displays: deleting any saved recording whose protected one-time link still waits for Trace Lab is refused with a notice naming that test, and the archive becomes deletable only after that test's own reminder is explicitly cleared. The archive store is the single authority for that refusal and re-reads every pending recovery from disk, so no in-memory list — fresh or stale — can bypass it. A linked delivery that arrives while this phone is already recording — an ordinary labeled session or a different linked test — is refused with one neutral message saying a recording is already running and to finish and save it before starting the linked test. Trace Lab may also re-open this app with `excerlock-walkingrecorder://share-archive?sessionId=…` to share a finished archive from its results screen. Both exports use `mach_continuous_time` receipt timestamps for offline ordering.

## Capture archive

Each share action creates one `walking-capture-<session-id>.zip` containing:

| File | Content |
|---|---|
| `raw-motion.ndjson` | Live activity/confidence, cadence and cumulative steps, 50 Hz requested raw accelerometer, raw gyroscope, and fused device motion: total/user acceleration, gravity, rotation rate, attitude and magnetic field where supported. Invalid values are explicit. |
| `labels.ndjson` | User label boundaries on the shared monotonic clock. A null `toLabel` means unlabeled transition/baseline, not assumed stationary. |
| `decisions.ndjson` | Current production-derived evidence, phase, relief intent, grace and deadlines. Actual Managed Settings shields are not instrumented or claimed. |
| `system.ndjson` | Permission/subscription state, configured and observed rates, lifecycle callbacks, sensor errors, recording gaps, clock mapping, flush/recovery events, and optional linked-session/canary markers owned by Walking Recorder. |
| `metadata.json` | Build/source commit, non-unique device model and OS, permission/availability, production parity constants, lab-only fields. |
| `schema.json` | Field/timebase/unit guide. |
| `manifest.json` | Completion status, duration, event/segment/gap counts, size and per-scenario counts. |
| `README.txt` | Archive interpretation cautions. |

All event streams use one monotonically increasing `sequence`. Every event includes receipt-time `mach_continuous_time` converted to nanoseconds plus a wall-clock pair. Core Motion source timestamps remain separately named with their native clock domain. Writes are incrementally buffered to 64 KB and critical label/lifecycle boundaries are synchronized immediately. A protected `recovery.json` checkpoint makes an unfinished session recover as `interrupted` on next launch. For linked sessions it also retains the non-exported one-time link until the operator removes the reminder after Trace Lab has saved or cancelled the test.

## Production-path parity

The shipping logic stays in:

- `app-next/src/runtime/detection/MotionAdapter.ts`
- `app-next/src/domain/walkingMachine.ts`

This standalone SwiftUI binary cannot safely execute that TypeScript, so `Sources/ProductionWalkingDetector.swift` is an explicit equivalent port, not a new classifier. It keeps the current policy unchanged: fresh medium/high walking/running **or** cadence at least 80 steps/minute, 5-second freshness, 3-second qualification and 30-second default grace. The shared `Fixtures/production-path.json` replay proves both implementations classify stationary/high cadence as active and then enter grace.

Run the real production source replay:

```sh
npx tsx tools/phone-walking-recorder/scripts/verify-production-parity.ts
```

Any future production classifier change must update the port and shared fixture together. The archive distinguishes intended reducer relief from actual OS shielding. This companion has no Family Controls/Managed Settings code, so it does not claim shield enforcement or enforcement latency.

## Build and test

Requirements: Xcode 26.x and `xcodegen`.

```sh
cd tools/phone-walking-recorder
xcodegen generate
xcodebuild -project PhoneWalkingRecorder.xcodeproj \
  -scheme PhoneWalkingRecorder \
  -destination 'platform=iOS Simulator,id=<dedicated-simulator-id>' \
  -derivedDataPath DerivedData \
  CODE_SIGNING_ALLOWED=NO test
```

For a UI-only simulator screenshot, launch a Debug build with `--ui-preview`. The screen displays **SIMULATED UI • NOT SENSOR EVIDENCE**, and this flag is compiled out of Release. Simulator checks validate software and layout only, never walking/shaking detection.

The repository guardrail:

```sh
npx vitest run --config guardrails/vitest.config.ts guardrails/phone-walking-recorder-boundary.test.ts
```

verifies that the companion stays outside root npm workspaces and `app-next`, uses its separate bundle, has no Expo Updates/background/App Group configuration, and has no network/location API.

## Direct device artifact and install

Use only an existing Apple Development identity/profile. Do not pass `-allowProvisioningUpdates`: if the existing wildcard development profile cannot sign this separate bundle for the connected phone, stop and report that exact blocker rather than creating or changing signing assets.

```sh
cd tools/phone-walking-recorder
xcodegen generate
SOURCE_COMMIT="$(git rev-parse HEAD)"
xcodebuild -project PhoneWalkingRecorder.xcodeproj \
  -scheme PhoneWalkingRecorder \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -derivedDataPath /private/task/path/DerivedData-device \
  RECORDER_SOURCE_COMMIT="$SOURCE_COMMIT" \
  DEVELOPMENT_TEAM=AX3C2B78YD \
  CODE_SIGN_STYLE=Automatic \
  'CODE_SIGN_IDENTITY=Apple Development' \
  build
```

Install only after `xcrun devicectl list devices` shows one unambiguous connected personal phone:

```sh
xcrun devicectl device install app \
  --device '<connected CoreDevice identifier>' \
  '/private/task/path/DerivedData-device/Build/Products/Release-iphoneos/PhoneWalkingRecorder.app'
```

Verify with `devicectl` that `com.johansardar.excerlock.lab.walkingrecorder` is installed and launchable. Never infer install success from a build or artifact alone. This bundle cannot overwrite `com.johansardar.excerlock`.
