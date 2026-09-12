---
status: accepted
date: 2026-03-11
---

# 0027: Isolate linked background recorder instrumentation

## Decision

Implement the linked Walking Recorder experiment as two local exports joined after the test, not as live inter-app label IPC. Walking Recorder remains an unentitled foreground-only app. A separate local ExcerLock Trace Lab build uses distinct app and Screen Time extension bundle identifiers, disables Expo Updates and hosted observability, and is rejected by Expo config when run under EAS Build.

Trace code is opt-in through `EXCERLOCK_LINKED_RECORDER_TRACE=1`: Swift is compiled behind `EXCERLOCK_LINKED_RECORDER_TRACE`, research JS implementations are selected by Metro, and a Babel constant makes trace calls removable from ordinary release bundles. The research ExcerLock host and Device Activity monitor extension share an append-only trace through the existing ExcerLock App Group. Ordinary ExcerLock artifacts must pass a research-marker scan.

A recorder-created UUID and cryptographically random, memory-only nonce authorize a two-hour ExcerLock trace. Both exports carry receipt wall time and `mach_continuous_time` so the offline joiner can reject mismatched sessions, boots, or devices and order evidence without relying on wall-clock stability. Raw inertial data and user labels stay in Walking Recorder. ExcerLock records only production-path motion fields and causal state/operation events.

Managed Settings setter return and readback are recorded as operation evidence, never as proof of visible shielding. A benign third canary app and an explicit operator outcome provide the visible result. Walking Recorder must never be selected as the shield target.

## Context

ADR 0026 isolated the installed foreground Walking Recorder specifically so it could not alter or imply production enforcement. That binary can compare its local Swift detector port with labeled foreground motion, but it has no App Group, Family Controls, background mode, Device Activity callback, Managed Settings write, or shield-outcome visibility. It therefore cannot test ExcerLock's real background lock/unlock chain.

The production chain crosses a React Native VM, durable detector persistence, policy publication, Device Activity registration, a separately launched extension, and Managed Settings. A JS-only logger would miss native motion receipts and extension-only callbacks. Giving Walking Recorder the production App Group would add privilege and signing complexity while still making live labels unreliable when either app is suspended.

The experiment must collect no GPS coordinates, microphone, camera, Health history, app-selection tokens, account/device identifiers, or arbitrary error text. It must not upload trace data, publish OTA, or make a public/TestFlight release. Distinct research App IDs and Family Controls/App Group provisioning remain a separately authorized signing step.

## Consequences

- The two exports can distinguish intended policy, execution opportunities, actual callbacks, durable transitions, write attempts/results, and operator-observed canary outcomes.
- Cross-process JSONL writes use a file lock and global sequence. Sessions have size/total limits, buffer-drop markers, queue-delay measurements, file protection, expiry, next-access pruning, and manual deletion.
- Research builds preserve the real detector/enforcement paths but require local provisioning for the separate bundle identifiers. This decision does not authorize building, signing, installing, collecting data, changing shields, or distributing anything.
- A post-hoc join cannot prove causation by temporal order alone. The validator reports gaps, loss/truncation, clock compatibility, and the latest causal events before each canary observation.
- The added source and config guardrails create maintenance cost whenever production motion or enforcement boundaries move.

## References

- [ADR 0012: Persisted detection and conditional watchdog](./0012-persisted-detection-and-conditional-watchdog.md)
- [ADR 0013: Async production runtime ownership](./0013-async-production-runtime-ownership.md)
- [ADR 0026: Isolate phone motion recorder](./0026-isolate-phone-motion-recorder.md)
- [`app-next/modules/excerlock-enforcement/ios/LinkedTraceWriter.swift`](../../app-next/modules/excerlock-enforcement/ios/LinkedTraceWriter.swift)
- [`tools/linked-recorder/join.py`](../../tools/linked-recorder/join.py)
- [`guardrails/linked-recorder-boundary.test.ts`](../../guardrails/linked-recorder-boundary.test.ts)
