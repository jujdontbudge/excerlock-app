---
status: accepted
date: 2026-09-15
---

# 0030: Recoverable and cancellable running linked test

- Status: Amends [0029](0029-guided-linked-test-flow.md). The guided two-app flow, the lab isolation boundaries, and the finish-only-by-return-link rule stay in force; the “Trace Lab must never persist the nonce” alternative and the “a running trace stays running if the hand-off failed” consequence below are superseded.

## Decision

A running Trace Lab test is recoverable and escapable without ever looking finished.

Trace Lab keeps a lab-local copy of the active handshake (session UUID, one-time nonce, protocol version) under one namespaced key in its own sandbox, written best-effort when the test starts and cleared when the test is saved, cancelled, expired, or found inactive. That copy is not evidence: only Walking Recorder's own return link can move a test to **Test finished — save it**. Its only purpose is to reopen the exact `excerlock-walkingrecorder://linked-session` link after a Trace Lab relaunch, so a person can continue the same test instead of opening a bare recorder. The copy never enters an export and is never uploaded; Walking Recorder's protected recovery file remains the recorder-side copy.

Beside the primary hand-off, a running test exposes one quiet, confirmed **Cancel test** action (subordinate text action, destructive confirmation). Cancelling writes a durable `abandoned-v1.json` record (`reason: cancelled`) instead of a finalized marker as the one authoritative abandonment transition, under the existing session lock and before anything else changes; then it stops native tracing, removes the isolated walking rule, deletes the unfinished trace payload, and clears the active descriptor. Expired cleanup writes the same record with `reason: expired`. `finalizedSessions()` never lists an abandoned session and `exportFinalizedSession()` refuses it; the tiny record stays in the lab App Group until the existing retention pruning removes it, so a void test keeps no measurement data but cannot masquerade as completed. A process that dies between those steps leaves the marker behind, and every later writer call finishes the same abandonment idempotently before it can observe a live session: a cancelled test can never be resumed, appended to, finalized, listed, or exported again, while a clean session can still start afterwards.

## Context

ADR 0029 rejected “let Trace Lab persist the nonce itself” because the recorder was meant to be the single owner of recovery. That model holds only while the recorder actually received the link. If the hand-off never reached Walking Recorder (the open failed, the app was reinstalled, or it was killed before processing), Trace Lab was left holding a running trace with no way to finish it and no exit except the two-hour limit, and the linked-recorder review required an honest bounded escape with enough retained handshake state to reopen the intended recorder flow where safe. Confusing the retained copy with finish evidence would be worse than the escape it enables, so the copy stays inert for phase decisions.

## Consequences

- An interrupted test now has three truthful outcomes: continue it through the recovered recorder link, finish it through the recorder's return link, or cancel it and start clean. Cancelling saves and exports nothing and leaves only the abandonment record.
- The recorder-side reminder that returns to Trace Lab is not a "saved" record: Trace Lab may have saved the trace or cancelled the test, and the recorder removes its non-exported one-time link only through one neutral **Remove this reminder** action with an inline confirmation that it must be used only after Trace Lab no longer needs the test. That removal never touches the recording archive.
- The one-time nonce exists in two lab-only sandboxes during a test: Trace Lab's namespaced recovery copy and Walking Recorder's protected recovery file. Both stay on the device, out of every export, and are cleared with their session; no production ExcerLock code imports the research store module.
- The trace contract gains `abandoned-v1.json`; finalized and abandoned sessions are distinguished by distinct markers, and only finalized markers are listable or exportable.
- The launch-evidence gate matches whole Trace-Lab-specific marker combinations, so generic recorder copy (for example a Walking Recorder notice containing “Recording on this phone”) can never satisfy a Trace Lab launch phase.

## References

- [0029: One guided two-app linked test flow](0029-guided-linked-test-flow.md)
- [0027: Isolate linked background recorder instrumentation](0027-isolate-linked-background-recorder.md)
- [`app-next/src/research/linkedTrace/LinkedTraceScreen.research.tsx`](../../app-next/src/research/linkedTrace/LinkedTraceScreen.research.tsx)
- [`app-next/src/research/linkedTrace/linkedHandshakeStore.research.ts`](../../app-next/src/research/linkedTrace/linkedHandshakeStore.research.ts)
- [`app-next/modules/excerlock-enforcement/ios/LinkedTraceWriter.swift`](../../app-next/modules/excerlock-enforcement/ios/LinkedTraceWriter.swift)
- [`app-next/scripts/verify-launch-evidence.cjs`](../../app-next/scripts/verify-launch-evidence.cjs)
