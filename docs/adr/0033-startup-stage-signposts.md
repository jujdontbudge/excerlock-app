---
status: accepted
date: 2026-09-16
---

# 0033: Startup stage signposts and a fixture-verified numeric parse

## Decision

Instrument cold start as five ordered os_signpost stage boundaries — `FirstReactRender`, `HydrationDone`, `RuntimeReady`, `BootGateRedirect`, `InteractiveHome` — from the existing native module (`app-next/modules/excerlock-startup`), the existing native React-content notification, and JS call sites in the root layout, `createRealRuntime`, and `BootGate`. `scripts/measure-startup.sh` now parses its own xctrace export with `scripts/startup-stage-medians.cjs` and prints per-stage median step and cumulative milliseconds across the launches found in the export, next to a JSON copy. ADR 0021's separation stands: these numbers are delegate-relative diagnostics and cannot satisfy the T15 cold-launch or first-frame budgets on their own.

## Context

The old marker emitted one `DelegateToInteractiveHome` interval with three events (`AppDelegateEntry`, `FirstReactChildMount`, `InteractiveHome`) and only the Home end was JS-driven. `scripts/measure-startup.sh` exported raw XML and recorded `numeric_timing_verified: false` because the export schema had no fixture to validate against. Plan §6.3 B10 asks for the five named stages and a finished numeric parse so the cold-start budget can be measured and fenced.

The JS wrapper keeps one monotonic, non-decreasing stage order: a stage may be skipped (a headless launch marks hydration and runtime before React ever renders) but an earlier boundary is refused after a later one, and repeated calls are idempotent and never re-enter native. Native mirrors that order, accepts either the native content notification or the JS `FirstReactRender` call for the same stage, and still requires that stage before `InteractiveHome`. The parser is deliberately schema-tolerant (attribute or typed-column rows; seconds or `MM:SS.ffffff`) because no real trace export exists in the repository; its accepted shapes are pinned by the jest fixture, and `real_trace_validated: false` is recorded in its output. Alternatives rejected: strict stage chaining (headless launches would lose their marks), parsing in bash (brittle and untestable in the jest suite), and reporting simulator numbers as budget evidence (ADR 0021).

## Consequences

A cold-start regression is now attributable to one stage per trace and comparable as medians across launches in one export. The schema is verified against the committed fixture only: the first real capture must confirm the accepted row shapes, and budget acceptance still requires a signed Release build measured on the target device (E2E-S1, ADR 0021). Stage events carry no user data.

## References

- `app-next/modules/excerlock-startup/` (`ios/ExcerlockStartupModule.swift`, `index.ts`)
- `app-next/src/runtime/startup/useInteractiveHomeMarker.ts`, `app-next/src/runtime/startup/__tests__/`
- `app-next/src/runtime/createRealRuntime.ts`, `app-next/src/features/launch/BootGate.tsx`, `app-next/app/_layout.tsx`
- `app-next/scripts/measure-startup.sh`, `app-next/scripts/startup-stage-medians.cjs`
- [0021: Separate startup diagnostics from full cold-launch acceptance](0021-startup-diagnostic-boundaries.md) — **accepted**; extended by this record.
- `plans/ship/T15-performance.md` (budgets), review-fixes master plan §6 (B10)
