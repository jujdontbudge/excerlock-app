---
status: accepted
date: 2026-09-17
---

# 0037: Simulator startup stage medians come from the unified log

## Decision

`scripts/measure-startup.sh` gains a second capture source, `--sim-log <udid> [--since <date>]`, which reads the B10 os_signpost stages out of the simulator's own unified log (`xcrun simctl spawn <udid> log show --signpost --style ndjson`) and feeds them to the existing `scripts/startup-stage-medians.cjs`. E2E-S1 records its per-stage medians through that path and labels them simulator numbers. The `--trace/--xpath` xctrace source stays as the contract for hosts where `xctrace record` can tap its target. ADR 0021/0033's boundary is unchanged: the §6.2 budgets remain a signed Release build measured on the target device.

## Context

ADR 0033 finished the numeric stage parse, but its only capture source was an xctrace trace. On this host (Xcode 26.4.1, `xctrace version 16.0 (17E202)`, iOS 26.4 `23E254a` runtime) no xctrace recording of the simulator can complete: the tap fails with `Device disconnected while trying to set tap configuration` then `Device disconnected while trying to start tap` about four seconds in — for `--instrument os_signpost` with and without `--launch`, for `--all-processes`, and for the `Time Profiler`, `System Trace` and `App Launch` templates — after which the recorder never exits and the partial `.trace` cannot be exported. The obvious explanations were eliminated first: the missing `Points of Interest` **template** is only a missing template file (the instrument ships and `--instrument os_signpost` records under the implicit Blank template), rebooting the pinned simulator does not help, and a host recording with no `--device` completes normally. E2E-S1 therefore reported the stage medians BLOCKED.

The stages themselves were never missing. The simulator's unified log does carry them; the harness read them with `log show --signposts`, which this toolchain rejects (`log: unrecognized option '--signposts'`) with a non-zero exit and empty stdout — indistinguishable from "this device has no signposts", which is what the E2E notes recorded. With the correct `--signpost` (singular), `--style ndjson` and `--style json` both return the full stage set with nanosecond `machTimestamp`s. Alternatives rejected: waiting for a host where xctrace can record (leaves the stage contract unverified and is not under this project's control) and reading the marks from the app's own storage (product code for a harness-only need).

## Consequences

Stage medians are reproducible on the pinned simulator again: E2E-S1 takes one sample per cold launch per stage and reports `median_step_ms` / `median_cumulative_ms` in `startup-sim-log/stage-medians.json`, through the same parser and JSON schema as the xctrace path, so the two sources stay comparable. The parser auto-detects a second input shape; its XML shape stays fixture-verified only, while the ndjson shape is verified against a real capture (jest covers both).

Two costs are accepted. The log path sees only the stages the app actually emits — a fresh install reaches `BootGateRedirect` and never `InteractiveHome`, so that stage stays blocked on the existing-user fixture. And `log show` reads a device-wide store, so a capture must be bounded with `--since` or its medians will mix in another scenario's launches. Simulator numbers must never be reported as §6.2 budget evidence.

## References

- `app-next/scripts/measure-startup.sh`, `app-next/scripts/startup-stage-medians.cjs`
- `app-next/e2e-next/harness.py` (`startup_signpost_rows`, `startup_marks`, `record_simulator_stage_medians`), `app-next/e2e-next/scenarios/s1_startup_budget.py`
- `app-next/src/runtime/startup/__tests__/measureStartup.test.ts` (both capture shapes)
- `app-next/e2e-next/README.md` finding 3 — the commands tried and their exact errors
- [0033: Startup stage signposts and a fixture-verified numeric parse](0033-startup-stage-signposts.md) — **accepted**; extended by this record.
- [0021: Separate startup diagnostics from full cold-launch acceptance](0021-startup-diagnostic-boundaries.md) — **accepted**; boundary preserved.
