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

- uses `ExcerLock Trace Lab` and registers only the `excerlock-linked-trace` scheme (Expo adds the lab bundle identifier as a scheme): no production Google OAuth redirect scheme and no `applinks:excerlock.com` universal links, so a production sign-in redirect or link can never open Trace Lab. The embedded client config names a lab-only placeholder Google client, so Trace Lab signs in with Apple or email;
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

The script always runs a clean prebuild, exports the double opt-in for both `expo prebuild` and the Xcode bundling phase, then runs `scripts/verify-standalone-research.cjs`: embedded `main.jsbundle` with the research screen, embedded `EXConstants.bundle/app.config` booting `extra.environment` `lab` with updates off, lab identity/App Group only, lab-only URL schemes, no associated domains, and no dev-client or LAN/OTA marker. Never pass the flag only to prebuild, or the artifact embeds the ordinary Expo config while the native project is research-configured; the verifier rejects that artifact.

A later authorized signing step requires already-authorized App IDs/profiles with Family Controls and `group.com.johansardar.excerlock.lab.linkedtrace` access. This source work does not create App IDs, groups, profiles, certificates, or portal records. If that isolated lab group is not already authorized, stop at this prerequisite; never share the production App Group or uninstall/replace production ExcerLock.

Ordinary exports select no-op JS boundaries, block `*.research.ts[x]`, compile Swift trace bodies out, retain production identifiers/updates/observability, and must pass:

```sh
node scripts/verify-no-linked-trace.cjs <ordinary-js-bundle-or-app>
```

After any trace prebuild, delete the generated `ios/` tree and run an unflagged clean prebuild plus `pod install` before making an ordinary native build. CocoaPods captures research-only source selection at install time; do not reuse trace-generated Pods.

## Minimal test protocol

1. Complete Trace Lab setup locally: use a signed build whose profile grants the isolated lab App Group, sign in to the development environment with Apple or email using a pre-existing trial/active lab entitlement (Trace Lab carries no production Google OAuth client), authorize Screen Time, select exactly one benign nonessential canary app (no categories or websites), and authorize Motion & Fitness. **Never select Walking Recorder.** Trace Lab's visible preflight blocks Start and names any missing step. It never uses production Adapty, auto-grants access, or fabricates a subscription entitlement; if authorized development access is unavailable, stop.
2. In Walking Recorder, explicitly opt into a linked local session and start the desired label. The recorder creates a UUID and a 256-bit one-time nonce. The nonce is transactionally retained only in the recorder session's protected recovery file, excluded from every export, and removed after the operator confirms Trace Lab was finalized or explicitly abandoned.
3. Tap **Open ExcerLock Trace Lab**. Review the second consent surface, confirm the harmless canary prerequisite, and start the production trace.
4. Return to Walking Recorder. Keep its foreground labels honest while ExcerLock moves through the real production/background path.
5. Mark lock/unlock test phases and the canary outcome you actually observed in Walking Recorder, the sole human-label owner. Trace Lab has no duplicate phase/outcome controls. A Managed Settings call returning is not a visible outcome.
6. Finish Walking Recorder; completion, interruption, storage-limit, and sensor-error paths preserve and reopen the protected Trace Lab link. End/export the production trace, then export the saved Recorder archive. If the recorder was terminated, relaunch it and use the visible recovery card. No file is uploaded automatically.
7. Join them offline:

```sh
python3 tools/linked-recorder/join.py \
  --recorder /local/recorder-export.zip \
  --production /local/excerlock-linked-trace.ndjson \
  --output /local/joined-result
```

The joiner validates protocol/session identity, sequence continuity, `mach_continuous_time`/wall anchors, truncation/drop markers, causal-path coverage, and explicit canary observations. It emits `joined.ndjson`, `validation.json`, and a caveat README. Temporal ordering does not itself prove causation.

## Trace contract

`LinkedTraceWriter` writes one JSON object per line under the isolated Trace Lab App Group. The host and Device Activity monitor extension resolve that group from the generated native configuration and serialize through `flock` and a shared sequence file. Each event has:

- schema/session/sequence;
- producer and process-instance UUID;
- event type and optional operation ID;
- receipt wall time and `mach_continuous_time` nanoseconds;
- measured writer queue delay;
- an event-specific allowlisted scalar payload.

The trace covers native motion callback receipt, JS input/fusion, durable detector transitions, runtime/headless opportunities, policy publication, watchdog operations, extension callback receipt/guard result, and shield setter attempt/return/readback. It rejects arbitrary keys/nested payloads, selection tokens, bundle/account/device identifiers, coordinates, and free-form errors.

Raw inertial vectors and all human labels remain only in Walking Recorder. ExcerLock retains callback stream/receipt/source timing, activity/cadence fields already consumed by production, and derived causal evidence, but no gravity or rotation vectors. The ExcerLock trace has a 25 MiB session cap, 100 MiB retained cap, bounded in-memory queue with drop summaries, two-hour active TTL, seven-day next-access retention pruning, complete-until-first-authentication file protection, explicit finalization/export, and manual deletion. A nonce-less abandon is available only after the active descriptor has expired and requires explicit local confirmation; it deletes rather than exports the expired trace, and when a new Recorder link is already open the screen returns to Start for that new session. Starting a session whose trace directory already exists (finalized, or expired but not abandoned) is refused; a stale "needs finalization" card in Walking Recorder can never delete an exported trace.

## Local checks

```sh
python3 -m unittest tools/linked-recorder/test_join.py
app-next/scripts/test-linked-trace-writer.sh
npx vitest run --config guardrails/vitest.config.ts guardrails/linked-recorder-boundary.test.ts guardrails/phone-walking-recorder-boundary.test.ts
# Standalone artifact rules and Expo-loader config, real loaders:
node --test app-next/scripts/standalone-research.test.cjs
node --test app-next/scripts/test-config-smoke.cjs
```
