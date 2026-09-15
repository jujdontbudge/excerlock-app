---
status: accepted
date: 2026-03-11
---

# 0027: Isolate linked background recorder instrumentation

## Decision

Implement the linked Walking Recorder experiment as two local exports joined after the test, not as live inter-app label IPC. Walking Recorder remains an unentitled foreground-only app. A separate local ExcerLock Trace Lab build uses distinct app and Screen Time extension bundle identifiers, disables Expo Updates and hosted observability, and is rejected by Expo config when run under EAS Build.

Trace code is opt-in through `EXCERLOCK_LINKED_RECORDER_TRACE=1`: Swift is compiled behind `EXCERLOCK_LINKED_RECORDER_TRACE`, research JS implementations are selected by Metro, and a Babel constant makes trace calls removable from ordinary release bundles. The research ExcerLock host and Device Activity monitor extension share an append-only trace through the distinct `group.com.johansardar.excerlock.lab.linkedtrace` App Group selected from the same executable configuration as their lab bundle identifiers. They must never read or mutate production policy, selection, or trace storage. Ordinary ExcerLock artifacts must pass a research-marker scan.

A recorder-created UUID and cryptographically random nonce authorize a two-hour ExcerLock trace. The Recorder stores that link transactionally only in its protected recovery checkpoint, excludes it from every export, restores it after termination or terminal write failures, and removes it after explicit finalization/abandon acknowledgement. Both exports carry receipt wall time and `mach_continuous_time` so the offline joiner can reject mismatched sessions, boots, or devices and order evidence without relying on wall-clock stability. Raw inertial vectors and all user labels stay in Walking Recorder. ExcerLock records callback stream/receipt/source timing, production activity/cadence fields, derived evidence, and causal state/operation events, but no gravity or rotation vectors.

Managed Settings setter return and readback are recorded as operation evidence, never as proof of visible shielding. A benign third canary app and an explicit operator outcome recorded only in Walking Recorder provide the visible result. Trace Lab owns consent, prerequisite checks, trace start/stop, export, and deletion; it has no duplicate human-label surface. Walking Recorder must never be selected as the shield target.

**Flow revised by [ADR 0029](./0029-guided-linked-test-flow.md):** Trace Lab now mints the one-time link, starts the trace, and opens Walking Recorder; the recorder keeps its labels and both canary observations inline in one recording state, and app-created consent/confirmation surfaces are gone. The isolation boundaries, App Group split, trace contract, and joiner semantics in this record are unchanged.

## Context

ADR 0026 isolated the installed foreground Walking Recorder specifically so it could not alter or imply production enforcement. That binary can compare its local Swift detector port with labeled foreground motion, but it has no App Group, Family Controls, background mode, Device Activity callback, Managed Settings write, or shield-outcome visibility. It therefore cannot test ExcerLock's real background lock/unlock chain.

The production chain crosses a React Native VM, durable detector persistence, policy publication, Device Activity registration, a separately launched extension, and Managed Settings. A JS-only logger would miss native motion receipts and extension-only callbacks. Giving Walking Recorder the production App Group would add privilege and signing complexity while still making live labels unreliable when either app is suspended. Giving Trace Lab the production App Group would let co-installed research and production apps overwrite each other's policy and selection state, so all research targets require the isolated lab group even when that leaves local signing blocked pending separate authorization.

The experiment must collect no GPS coordinates, microphone, camera, Health history, app-selection tokens, account/device identifiers, or arbitrary error text. It must not upload trace data, publish OTA, or make a public/TestFlight release. Distinct research App IDs and Family Controls/App Group provisioning remain a separately authorized signing step.

## Consequences

- The two exports can distinguish intended policy, execution opportunities, actual callbacks, durable transitions, write attempts/results, and Recorder-owned operator-observed canary outcomes.
- Cross-process JSONL writes use a file lock and global sequence. Sessions have size/total limits, buffer-drop markers, queue-delay measurements, file protection, expiry, next-access pruning, and manual deletion.
- Research builds preserve the real detector/enforcement paths but require local provisioning for the separate bundle identifiers and isolated lab App Group. Missing portal authorization is an install prerequisite, never a reason to reuse production storage. This decision does not authorize building, signing, installing, collecting data, changing shields, or distributing anything.
- Trace Lab blocks Start until preflight confirms isolated lab storage, an existing trial/active development entitlement, Screen Time authorization, exactly one app-only canary selection, and required Motion readiness, plus explicit operator confirmation that the canary is harmless and is not Walking Recorder. It never uses production Adapty, auto-grants access, or fabricates an entitlement; unavailable development access is a stop condition.
- An unexpired trace always requires its nonce. After the two-hour TTL, an explicit nonce-less abandon may delete the expired local trace and permit a new session; it cannot export or finalize evidence.
- A post-hoc join cannot prove causation by temporal order alone. The validator reports gaps, loss/truncation, clock compatibility, and the latest causal events before each canary observation.
- The added source and config guardrails create maintenance cost whenever production motion or enforcement boundaries move.

## References

- [ADR 0012: Persisted detection and conditional watchdog](./0012-persisted-detection-and-conditional-watchdog.md)
- [ADR 0013: Async production runtime ownership](./0013-async-production-runtime-ownership.md)
- [ADR 0026: Isolate phone motion recorder](./0026-isolate-phone-motion-recorder.md)
- [`app-next/modules/excerlock-enforcement/ios/LinkedTraceWriter.swift`](../../app-next/modules/excerlock-enforcement/ios/LinkedTraceWriter.swift)
- [`tools/linked-recorder/join.py`](../../tools/linked-recorder/join.py)
- [`guardrails/linked-recorder-boundary.test.ts`](../../guardrails/linked-recorder-boundary.test.ts)
