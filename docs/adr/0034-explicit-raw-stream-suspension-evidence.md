---
status: accepted
date: 2026-09-16
---

# 0034: Explicit raw-stream suspension evidence in Walking Recorder archives

## Decision

The standalone Walking Recorder lab app writes the raw inertial streams (accelerometer, gyroscope, fused device motion at the requested 50 Hz) for the whole session in every label mode, and it never lets a label window with missing raw motion read as a still phone. Two mechanisms carry that evidence:

- Live capture appends a `raw_stream_suspended` event to `system.ndjson` for every span longer than 2 seconds in which no raw inertial sample was delivered. Each interval starts at the last observed sample receipt, ends at the next observed receipt (or the session end / relaunch observation), names its basis (`app_lifecycle_raw_gap`, `raw_delivery_gap`, `session_ended_without_raw_resume`, `no_raw_samples_observed`, `process_termination_recovered_on_launch`) and always states `exactSuspensionTimeKnown: false`.
- `manifest.json` carries a `rawStream` block with per-stream sample counts and first/last receipts, every suspension interval with its wall-clock range, `endedBeforeSessionEnd`, and one entry per labeled window with `rawSampleCount`, `uncoveredSeconds` and a `covered`/`partial`/`none` coverage state. A process that dies before finalizing is rebuilt from the last `recovery.json` checkpoint by the relaunch recovery pass, with counts marked `as_of_last_checkpoint`.

`tools/linked-recorder/join.py` validates the block: an undeclared raw gap longer than the threshold fails closed, a suspension that overlaps delivered samples fails closed, and a labeled window must declare coverage consistent with the streams. Archives whose manifest predates the block still join with a warning.

No background keep-alive, background mode or location API is added. The lab's no-location, no-background boundary stands; what changes is that suspension is now stated instead of implied.

## Context

The linked-walk capture `e899ae6f` labeled 345 seconds of `normal_walking` while the recorder's raw stream stopped at 68 seconds: the phone was pocketed, the screen locked and iOS suspended the process (no keep-alive by design), which the relaunch pass then marked only `interrupted` — the manifest said nothing about raw coverage, so the label window looked like a quiet phone. The multi-scenario archive `f09377f9` kept decisions and labels with no coverage statement either. `ml-detector-design-f1` Step 1 depends on raw IMU under labels and its investigation flagged exactly this loose end: "the recorder silently loses raw coverage on suspension while the label clock keeps running — a lab-app fix (surface 'raw stream suspended' in the archive manifest)".

Alternatives considered:

- Adding a background keep-alive (location or otherwise) was rejected: it contradicts the lab's stated capture boundary and the `phone-walking-recorder-boundary` guardrail, and production residency for any always-on sampler is the separate open issue #140.
- Keeping the screen awake as the only mitigation was rejected as the archive's contract: the operator cannot be assumed to notice a lock, and evidence must survive operator behavior.
- Reporting gaps only as `system.ndjson` events was rejected because the manifest is the archive's summary and the offline joiner's contract surface; the joiner reads no system events for coverage.
- Flagging only windows with zero samples was rejected: `e899ae6f` had pre-label samples inside its walking window, so percentage coverage with explicit uncovered seconds is the honest statement.

## Consequences

- A suspended label window is now machine-detectable offline (`join.py` fails on silent gaps and reports uncovered windows), which is what Step 1's capture protocol needs.
- The archive never claims an exact suspension instant; intervals are observed receipt ranges, and wall-clock pairs are included for joining.
- Interrupted archives carry lower-bound sample counts and a `process_termination_recovered_on_launch` tail instead of an exact finalization; legacy manifests still load and join with a warning.
- The recorder's live health card shows "Raw motion stream suspended" and the save notice names suspended seconds, so the operator sees the same fact the archive records.
- The 2-second threshold is deliberately generous versus normal Core Motion jitter; it lives in `RawStreamCoverage.swift` and is mirrored by `join.py`.

## References

- [`tools/phone-walking-recorder/Sources/RawStreamCoverage.swift`](../../tools/phone-walking-recorder/Sources/RawStreamCoverage.swift) — tracker, intervals, manifest block, recovery rebuild.
- [`tools/phone-walking-recorder/Sources/SessionArchive.swift`](../../tools/phone-walking-recorder/Sources/SessionArchive.swift) — finalize/checkpoint/recovery writes.
- [`tools/linked-recorder/join.py`](../../tools/linked-recorder/join.py) — offline validation of the manifest evidence.
- [`tools/linked-recorder/test_join.py`](../../tools/linked-recorder/test_join.py) and [`tools/phone-walking-recorder/Tests/RawStreamArchiveIntegrationTests.swift`](../../tools/phone-walking-recorder/Tests/RawStreamArchiveIntegrationTests.swift) — the failing-before/passing-after proofs.
- Related ADRs: [0026](0026-isolate-phone-motion-recorder.md), [0027](0027-isolate-linked-background-recorder.md).
- The `ml-detector-design-f1` investigation report (firstmate task data, not in this repository) defines Step 1 and the loose end this ADR closes.
