---
status: accepted
date: 2026-09-10
---

# 0014: Immutable production calendar history

## Decision

Persist calendar HistoryDay seals in `excerlock-next.history.v1`, separately from rule accounting.
The first observed day anchors accounting; each reconciliation fills missing days through yesterday.
Unopened scheduled days without measured achievement seal missed. Existing seals survive rule edits,
region removal, late sensor history and timezone travel unchanged. Preserve at most the current and
previous 399 calendar days, and 35 days of RuleDay accounting. Persist seals before pruning rule rows.
The archive participates in hydration and confirmed account deletion with the other owned stores.

## Context

T11 preserves P2-T15 sections 4/6. Previously production status recomputed every past calendar day from
current rules and had no persisted seals or retention. This could change streak history after deletion
of a condition and allow unbounded projection. Calendar DayKey changes, not 24-hour timers, govern sealing.
The current detector uses measured steps and confirmed gym intervals; missing usage remains null.

## Consequences

Sealed activity is intentionally not rewritten by late measurements. Sensor-history catch-up completeness
before sealing, timestamp convergence and cross-midnight rule ownership still need separate verification.
Post-seal retention now also bounds raw daily ledgers and gym history at 400 calendar days, preserving
step dedup cursors, pending duration intents, open/cross-cutoff visits and account-generation ownership.
Gym compaction first persists a monotonic cutoff; reads enforce it even after partial physical-write failure.
Root awaits archive and RuleDay durability before pruning, once per forward calendar cutoff.
No historical schedule versions exist before first observed state, so a new install does not fabricate
hundreds of missed days. Existing historical measured facts establish an earlier start when available.
Native enforcement has no separate JS earnedUnlocks store; retention of native suppression is handled by
its policy expiry rather than inventing an unrelated local collection.

## References

- `plans/ship/T11-detection-adapters.md`, step 8.
- `plans/rebuild/phase-2-backend/P2-T15-session-credit-engine.md`, sections 4/6.
- `app-next/src/domain/sealDay.ts`, `app-next/src/state/historyStore.ts`.
- `0013-async-production-runtime-ownership.md` (accepted, complementary).
