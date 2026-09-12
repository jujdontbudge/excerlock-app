# Linked Recorder research build

This is a **local research build**, not a release profile. It links a foreground Walking Recorder export to actual ExcerLock production-path evidence after the test. Nothing in this directory authorizes a build, signing change, install, shield change, data collection, OTA publication, upload, TestFlight distribution, release, or App Store submission.

## Build boundary

The opt-in is exact:

```sh
EXCERLOCK_ENV=dev EXCERLOCK_LINKED_RECORDER_TRACE=1 npx expo prebuild --clean
```

When the flag is present, Expo config:

- uses `ExcerLock Trace Lab` and the `excerlock-linked-trace` scheme;
- uses `com.johansardar.excerlock.lab.linkedtrace` plus distinct `.monitor`, `.shield`, `.shieldaction`, and `.report` extension identifiers;
- sets runtime `2-linked-recorder-1`;
- disables Expo Updates and removes its URL/channel headers;
- omits the Sentry config plugin and selects local no-network Sentry/PostHog implementations;
- defines native trace compilation only for the research pod/monitor targets.

The config refuses the flag when `EAS_BUILD=true`, any `EAS_BUILD_PROFILE` is set, or `EXCERLOCK_ENV` is not `dev`. There is no EAS research profile. Separate explicit App IDs/profiles with Family Controls and `group.com.johansardar.excerlock` access are required before a later authorized local signing step.

Ordinary exports select no-op JS boundaries, block `*.research.ts[x]`, compile Swift trace bodies out, retain production identifiers/updates/observability, and must pass:

```sh
node scripts/verify-no-linked-trace.cjs <ordinary-js-bundle-or-app>
```

After any trace prebuild, delete the generated `ios/` tree and run an unflagged clean prebuild plus `pod install` before making an ordinary native build. CocoaPods captures research-only source selection at install time; do not reuse trace-generated Pods.

## Minimal test protocol

1. Select a benign, nonessential canary app in ExcerLock Screen Time settings. **Never select Walking Recorder.**
2. In Walking Recorder, explicitly opt into a linked local session and start the desired label. The recorder creates a UUID and a 256-bit one-time nonce; the nonce stays in memory and is not exported.
3. Tap **Open ExcerLock Trace Lab**. Review the second consent surface and start the production trace.
4. Return to Walking Recorder. Keep its foreground labels honest while ExcerLock moves through the real production/background path.
5. Mark lock/unlock test phases and the canary outcome you actually observed. A Managed Settings call returning is not a visible outcome.
6. Finish Walking Recorder; it reopens Trace Lab. End/export the production trace, then export the saved Recorder archive. No file is uploaded automatically.
7. Join them offline:

```sh
python3 tools/linked-recorder/join.py \
  --recorder /local/recorder-export.zip \
  --production /local/excerlock-linked-trace.ndjson \
  --output /local/joined-result
```

The joiner validates protocol/session identity, sequence continuity, `mach_continuous_time`/wall anchors, truncation/drop markers, causal-path coverage, and explicit canary observations. It emits `joined.ndjson`, `validation.json`, and a caveat README. Temporal ordering does not itself prove causation.

## Trace contract

`LinkedTraceWriter` writes one JSON object per line under the ExcerLock App Group. The host and Device Activity monitor extension serialize through `flock` and a shared sequence file. Each event has:

- schema/session/sequence;
- producer and process-instance UUID;
- event type and optional operation ID;
- receipt wall time and `mach_continuous_time` nanoseconds;
- measured writer queue delay;
- an event-specific allowlisted scalar payload.

The trace covers native motion callback receipt, JS input/fusion, durable detector transitions, runtime/headless opportunities, policy publication, watchdog operations, extension callback receipt/guard result, and shield setter attempt/return/readback. It rejects arbitrary keys/nested payloads, selection tokens, bundle/account/device identifiers, coordinates, and free-form errors.

Raw inertial streams and labels remain only in Walking Recorder. The ExcerLock trace has a 25 MiB session cap, 100 MiB retained cap, bounded in-memory queue with drop summaries, two-hour active TTL, seven-day next-access retention pruning, complete-until-first-authentication file protection, explicit finalization/export, and manual deletion.

## Local checks

```sh
python3 -m unittest tools/linked-recorder/test_join.py
app-next/scripts/test-linked-trace-writer.sh
npx vitest run --config guardrails/vitest.config.ts guardrails/linked-recorder-boundary.test.ts guardrails/phone-walking-recorder-boundary.test.ts
```
