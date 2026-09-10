# Ship T06 — client telemetry evidence

## Implemented locally

- PostHog boundary with canonical-ready identity, generation, and opt-in gates.
- Device ID/context registration before identify-triggered flag reload.
- Two-second stable flag fallback, allowlisted values, and mounted-surface-only exposure.
- Narrow paywall experiment port with variant and generation validation.
- Queue clearing before reset (the installed PostHog SDK preserves queues on reset).
- Client-side purchase/trial/subscription lifecycle single-emitter guard; Adapty remains owner.
- Crash-only Sentry options, strict PII scrub, exact release/dist, single initialization guard.
- Sentry Metro integration and fail-closed source-map upload helper.
- Typed runtime analytics event additions and registry documentation.

## Local verification

- `npm run typecheck --workspace app-next` — passed.
- Focused analytics/observability Jest — 3 suites, 15 tests passed.
- `npm test --workspace packages/analytics-events` — 4 files, 29 tests passed; no type errors.
- `sh -n app-next/scripts/upload-sourcemaps.sh` — passed.
- `git diff --check` — passed.
- Full app Jest baseline — 184 suites / 794 tests passed; 2 unrelated existing UI tests failed (`conditions-tabs` and `DayPicker`).

## External release gates (not claimed)

- Confirm real PostHog person binding and mounted exposure ingestion in preview.
- Confirm preview event ingestion under canonical identity and opt-out behavior.
- Run an authorized physical-device crash and verify symbolication.
- Run the source-map helper only for an authorized real build/update with real metadata.

## Integration note

The current privacy manifest/App Store privacy-label plan must be reconciled by root/T13: canonical PostHog `identify` makes Product Interaction data linked to identity. This task does **not** claim that manifest or ASC labels are correct.

Runtime composition remains root-owned. T06 now supplies the concrete SDK
factory, including persisted queue clearing, `setPersonProperties` delegation,
singleton disposal, and the actual typed Sentry binding. This still does
**not** claim end-to-end telemetry until root composes it and the external
release gates above pass.
