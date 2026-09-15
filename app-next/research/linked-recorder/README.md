# Linked Recorder research build

This is a **local research build**, not a release profile. It links a foreground Walking Recorder export to actual ExcerLock production-path evidence after the test. Nothing in this directory authorizes a build, signing change, install, shield change, data collection, OTA publication, upload, TestFlight distribution, release, or App Store submission.

## Build boundary

The opt-in is exact, and there are two research build shapes:

```sh
# Metro-served development build (expo-dev-client, needs the Mac while it runs)
EXCERLOCK_ENV=dev EXCERLOCK_LINKED_RECORDER_TRACE=1 npx expo prebuild --clean

# Standalone Release artifact: embedded JS bundle, no Metro, no dev client
EXCERLOCK_ENV=lab EXCERLOCK_LINKED_RECORDER_TRACE=1 npx expo prebuild --clean
```

When the flag is present, Expo config:

- uses `ExcerLock Trace Lab` and registers only the `excerlock-linked-trace` scheme (Expo adds the lab bundle identifier as a scheme): no production Google OAuth redirect scheme and no `applinks:excerlock.com` universal links, so a production sign-in redirect or link can never open Trace Lab. The lab never signs in to any account, so its embedded client config carries no Google OAuth client at all;
- embeds no client identity group at all: `extra` holds the `lab` environment marker and nothing else, so there is no Supabase/Adapty/API/PostHog/Sentry/Google field to satisfy with a placeholder, the lab builds with no production keys, and the artifact proof rejects any identity group that appears;
- uses `com.johansardar.excerlock.lab.linkedtrace` plus distinct `.monitor`, `.shield`, `.shieldaction`, and `.report` extension identifiers;
- uses the distinct `group.com.johansardar.excerlock.lab.linkedtrace` App Group for the research app and every research extension, never the production group;
- sets runtime `2-linked-recorder-1`;
- disables Expo Updates and removes its URL/channel headers;
- omits the Sentry config plugin and selects local no-network Sentry/PostHog implementations;
- defines native trace compilation only for the research pod/monitor targets.

The config refuses the flag when `EAS_BUILD=true`, any `EAS_BUILD_PROFILE` is set, or `EXCERLOCK_ENV` is neither `dev` (Metro) nor `lab` (standalone). `lab` without the flag is also refused, so no ordinary build can acquire lab semantics. There is no EAS research profile. The CommonJS research configuration is the single executable owner of the opt-in, app/extension bundle identifiers, App Group, URL scheme, and runtime version used by Expo config, target configs, Babel, and Metro.

The standalone (`lab`) prebuild additionally: excludes `expo-dev-client`, `expo-dev-launcher`, and `expo-dev-menu` from the generated Podfile; strips the dev-launcher URL scheme, Bonjour service, and local-network keys from the built `Info.plist`; and pins the already-installed lab Device/Development provisioning profiles per target by their installed names (`ExcerLock Trace Lab … Development`).

Build it end to end and verify the artifact:

```sh
app-next/scripts/build-linked-recorder-standalone.sh
# -> .scratch/standalone-research/DerivedData/Build/Products/Release-iphoneos/ExcerLock.app
```

The script always runs a clean prebuild, exports the double opt-in for both `expo prebuild` and the Xcode bundling phase, then runs `scripts/verify-standalone-research.cjs`: embedded `main.jsbundle` with the research screen, embedded `EXConstants.bundle/app.config` booting `extra.environment` `lab` with updates off, lab identity/App Group only, no client identity group (no production or placeholder Supabase/Adapty/API/PostHog/Sentry/Google OAuth field), lab-only URL schemes, no associated domains, and no dev-client/LAN/OTA or production-identity-graph marker. Never pass the flag only to prebuild, or the artifact embeds the ordinary Expo config while the native project is research-configured; the verifier rejects that artifact.

A later authorized signing step requires already-authorized App IDs/profiles with Family Controls and `group.com.johansardar.excerlock.lab.linkedtrace` access. This source work does not create App IDs, groups, profiles, certificates, or portal records. If that isolated lab group is not already authorized, stop at this prerequisite; never share the production App Group or uninstall/replace production ExcerLock.

Ordinary exports select no-op JS boundaries, block `*.research.ts[x]`, compile Swift trace bodies out, retain production identifiers/updates/observability, and must pass:

```sh
node scripts/verify-no-linked-trace.cjs <ordinary-js-bundle-or-app>
```

After any trace prebuild, delete the generated `ios/` tree and run an unflagged clean prebuild plus `pod install` before making an ordinary native build. CocoaPods captures research-only source selection at install time; do not reuse trace-generated Pods.

## Minimal test protocol

One guided path, both apps on the phone. Trace Lab boots into its research screen, not the production onboarding or paywall. Nothing is uploaded and no Mac service is needed at any point.

1. Open **ExcerLock Trace Lab** and read the three lines under **How the test works**. Only what this phone is actually missing is shown, with one action for it: **Allow Screen Time** (the only way iOS lets the lab record the real shield), **Choose canary app** (exactly one harmless app — never Walking Recorder or ExcerLock Trace Lab — because the shield must block something you can safely try to open; iOS does not disclose the selected bundle identifiers to the host app, so the screen states the rule and cannot verify the choice), or **Allow Motion & Fitness**. The lab runs on a lab-local identity and research entitlement instead of a production account: it never signs in, never contacts Supabase or Adapty, and needs no production keys.
2. Tap **Start test**. Trace Lab mints the session UUID and the 256-bit one-time nonce, installs its isolated always-active walking rule (removed again as soon as no trace is running), starts the linked background trace, and opens Walking Recorder through the lab-only `excerlock-walkingrecorder://linked-session` link. Keep Trace Lab in the background from here on, exactly like ExcerLock during a normal walk.
3. In **Walking Recorder**, tap the card for what you are doing (walking, treadmill, shaking the phone, sitting). Recording already started; labels and their boundaries stay the operator's honest input and live only in the recorder.
4. Answer the one **Canary check** card inline as it asks: first while walking — ExcerLock releases the shield while a verified walk is live, so the canary app should open ("It opened normally" / "Blocked (shield shown)" / "Did not try / not sure"); then after standing still for a full minute, longer than the stop grace — the shield should be back ("Blocked (shield shown)" / "It opened normally" / "Did not try / not sure"). These two operator observations are the visible-outcome evidence the offline joiner needs; a Managed Settings call returning is not a visible outcome.
5. Tap **Finish test**. The recorder finalizes its archive and returns to Trace Lab with the one-time link.
6. In **Trace Lab**, the newest saved test shows one primary **Share trace file** action with the Walking Recorder archive export beside it, both grouped in the saved-test card. Save both files to Files/On My Phone. Deletion stays a quiet text action with a confirmation, and it removes only the trace; the recorder archive is separate. Finished traces stay in the lab App Group, so the share actions still work after a Trace Lab relaunch or after iOS purges the temporary export copy.
7. If a test is interrupted, relaunch either app: Walking Recorder shows **Linked test needs finishing** and returns to Trace Lab, and a Trace Lab that was closed mid-test re-opens the recorder's recovery link from its own lab-local handshake copy, so **Open Walking Recorder** continues the exact same session. If that copy is missing (for example Walking Recorder never received the link), the running screen still offers the recorder and one quiet, confirmed **Cancel test** action: it stops the trace, deletes the unfinished trace payload, records the test as abandoned instead of saved in the lab App Group, removes the isolated walking rule, saves and exports nothing, and returns to a clean **Start test**. The card always surfaces the newest unfinished test first (an unfinished recording outranks an archive that is already finalized and only waiting for Trace Lab, and equal start times order by session id), so a stale recovery can never hide the test the operator actually just ran. Only the recorder's own return link moves a test to **Test finished — save it**; reopening Trace Lab or its periodic check never marks a running test finished. A trace past its two-hour limit can only be deleted, never exported, and the screen returns to **Start test** for the next run.
8. Join them offline:

```sh
python3 tools/linked-recorder/join.py \
  --recorder /local/recorder-export.zip \
  --production /local/excerlock-linked-trace.ndjson \
  --output /local/joined-result
```

The joiner validates protocol/session identity, sequence continuity, `mach_continuous_time`/wall anchors, truncation/drop markers, causal-path coverage, and explicit canary observations. It emits `joined.ndjson`, `validation.json`, and a caveat README. Temporal ordering does not itself prove causation.

The device proof of the standalone artifact is executable:

```sh
app-next/scripts/prove-linked-recorder-on-phone.sh [path/to/ExcerLock.app]
```

It refuses to run while Metro listens on 8081, installs the signed Trace Lab over the current one, and launches it with no payload URL. The proof then requires positive OCR evidence that the installed binary rendered a real research screen. Because the install lands over existing lab data, every legitimate persisted phase passes: ready, running (including a trace recovered after a relaunch), finished awaiting the recorder's save link, expired, and the saved-list screen. Each phase is recognized by a combination of normalized lines that only the research screen renders (for example running needs both “Trace Lab is recording in the background” and “Recording on this phone”), so a Walking Recorder notice that happens to contain a generic phrase, a blank screen, a crash back to the Home Screen, any other unexpected screen, the expo-dev-client prompt, or an OCR miss fails the proof. The screenshots and OCR transcript stay behind as diagnostics, and the proof finally checks that production ExcerLock's install record is unchanged.

## Trace contract

`LinkedTraceWriter` writes one JSON object per line under the isolated Trace Lab App Group. The host and Device Activity monitor extension resolve that group from the generated native configuration and serialize through `flock` and a shared sequence file. Finalization writes a `finalized-v1.json` marker beside the trace, so a finished test is listed and its shareable copy is rebuilt from the App Group on demand after a relaunch or a temporary-directory purge. Each event has:

- schema/session/sequence;
- producer and process-instance UUID;
- event type and optional operation ID;
- receipt wall time and `mach_continuous_time` nanoseconds;
- measured writer queue delay;
- an event-specific allowlisted scalar payload.

The trace covers native motion callback receipt, JS input/fusion, durable detector transitions, runtime/headless opportunities, policy publication, watchdog operations, extension callback receipt/guard result, and shield setter attempt/return/readback. It rejects arbitrary keys/nested payloads, selection tokens, bundle/account/device identifiers, coordinates, and free-form errors. Payload scalars keep JavaScript `0` and `1` as numbers: the decoder discriminates Foundation booleans by CF type identity before any numeric value can be bridged to a Bool, so a real number is never written as `false`/`true`.

Raw inertial vectors and all human labels remain only in Walking Recorder. ExcerLock retains callback stream/receipt/source timing, activity/cadence fields already consumed by production, and derived causal evidence, but no gravity or rotation vectors. The ExcerLock trace has a 25 MiB session cap, 100 MiB retained cap, bounded in-memory queue with drop summaries, two-hour active TTL, seven-day next-access retention pruning, complete-until-first-authentication file protection, explicit finalization/export, and manual deletion. An abandoned or cancelled session writes an `abandoned-v1.json` record instead of `finalized-v1.json` and its recorded trace payload is deleted immediately, so a void test keeps no measurement data, can never be listed or exported, and leaves only the tiny record until retention pruning removes it. A trace past its two-hour limit can only be deleted — never exported — and the screen then returns to **Start test**, which always mints a fresh session, so a stale link can never restart or delete an already-saved trace. Starting a session whose trace directory already exists (finalized, or expired but not abandoned) is refused; a stale "needs finishing" card in Walking Recorder can never delete an exported trace.

## Local checks

```sh
python3 -m unittest tools/linked-recorder/test_join.py
app-next/scripts/test-linked-trace-writer.sh
npx vitest run --config guardrails/vitest.config.ts guardrails/linked-recorder-boundary.test.ts guardrails/phone-walking-recorder-boundary.test.ts
# Standalone artifact rules and Expo-loader config, real loaders:
node --test app-next/scripts/standalone-research.test.cjs
node --test app-next/scripts/test-config-smoke.cjs
# Guided flow: one lab-only link contract, screen state machine, link parsing,
# and the lab-local identity graph (no production Supabase/Adapty construction):
npx jest src/research/linkedTrace --runInBand
# Walking Recorder link contract, durable linked-delivery idempotence, archive (simulator):
cd tools/phone-walking-recorder && xcodegen generate && xcodebuild -project PhoneWalkingRecorder.xcodeproj \
  -scheme PhoneWalkingRecorder -destination 'platform=iOS Simulator,id=<simulator-id>' \
  -derivedDataPath DerivedData CODE_SIGNING_ALLOWED=NO test
# On the phone, with no Metro server running:
app-next/scripts/prove-linked-recorder-on-phone.sh
```
