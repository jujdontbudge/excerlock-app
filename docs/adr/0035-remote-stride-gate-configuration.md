---
status: accepted
date: 2026-09-17
---

# 0035: Remote stride-gate thresholds behind measured clamps and a kill switch

## Decision

The stride-rhythm gate's thresholds stay one immutable shipped set (`SHIPPED_STRIDE_GATE` in
`app-next/src/runtime/detection/strideGateConfig.ts`) and become retunable without an App Store release
through one PostHog payload flag, `stride_gate_config`, read over the existing flag rail. The published
gate (aa293011) is the fallback for every absent, malformed or unreadable payload, so the default path is
bit-identical to the proven gate: `strideGateShippedTrace.test.ts` replays every capture through the
default analyzer and a default-constructed adapter and requires an exact match with the traces recorded
from the pre-configuration implementation (`fixtures/strideGateShippedTrace.json`).

The control surface is deliberately narrow:

- **Per-field clamps, anchored on measurement.** Every field carries a clamp whose endpoints come from the
  capture distribution recorded in the gate reports (walking/treadmill n=1726 windows, shaking n=328,
  sitting n=3100, plus the per-window verdict runs). A value outside its clamp rejects the **whole**
  payload; nothing is partially applied, and a per-field report says what was asked and why it failed.
- **Cross-field invariants.** Individually in-range values that cannot describe a usable gate (a veto
  frequency under the walking band top, a span floor at the window itself, a dwell longer than the Apple
  path it exists to beat) reject the payload too.
- **Only the safe direction where the margin is thin.** Several fields may move one way only: the dwell
  never below the 8 evaluations that a captured shake reached exactly, the penalty never below the 8 s that
  blocked it, the still floor and the stride floors never below their shipped values, the walking band never
  past the measured shake band, the evaluation cadence never faster than the cadence the dwell margin was
  measured at.
- **A kill switch inside the payload.** `{"killSwitch": true}` drops the raw-stream leg entirely, leaving
  the Apple-only cadence/activity behaviour of pre-aa293011. The two plumbing fixes are correctness, not
  tuning, and survive it: the clock-skew clamps on activity and pedometer samples and the 5 s freshness
  contract.
- **The grace bounds are a parameter with the reducer's own contract as its clamp.** The user's stop-grace
  is clamped into the accepted bounds and then into `WALK_GRACE_MIN_MS..WALK_GRACE_MAX_MS` (30 s-5 min), so
  no remote value can hand `reduceWalking` a grace it rejects or a relief longer than a user can already
  select. Those two bounds move from inline literals to exports in `walkingMachine.ts` so the gate clamp and
  the reducer contract cannot drift.
- **The effective configuration is a report, not a log line.** `runtime.strideGate.report()` and
  `MotionAdapter.strideGate()` return `{ source: 'remote' | 'shipped' | 'rejected', flagKey, killSwitch,
  effective, fields: { requested, applied, accepted, reason } }`; `describeStrideGateReport` renders one
  log-safe line. Flag rails are read by `NativeRuntimeEffects` on mount and on every foreground, the
  `shield_copy` convention.

## Context

The gate landed at aa293011 with its thresholds as exported constants consumed by `MotionAdapter` and
`DetectionService`, next to a native 50 Hz device-motion stream. Retuning a threshold therefore needed a
build. The captain's ask (firstmate task `gate-ota-config-o1`, re-issued as `gate-ota-config-o2`) is to make
as much of the gate changeable over the air as the constraints allow, with two non-negotiables: a remote
value may never be able to break unlocking, and may never make the gate unlock on a still phone.

The gate reports give the numbers that make clamps decidable rather than arbitrary: the spent shake tail
measured 0.049 g of recent RMS against a 0.06 g still floor; the longest stride-class run on a shake was
exactly 8 evaluations (blocked by the 8 s penalty from its own vigorous opening) while every confirmed walk
ran 14-208; the shaking band overlaps the walking band (p5 1.28 Hz against walking p1 1.25 Hz), so neither
the band nor the floors may cross into it. Each clamp and each invariant states that anchor in the module.

Alternatives rejected: clamping-and-applying the valid fields of a partly-invalid payload (a half-applied
gate is a configuration nobody can reason about, and every field is coupled to the others); a separate
`stride_gate_killswitch` flag (the kill switch must not race the parameters it disables, and one payload
keeps a single atomic decision); per-field remote clamps (an operator could then widen a clamp into the
measured margins); a Sentry event or a new recorder trace type for the effective configuration (the
recorder's event vocabulary is a closed union owned by the research surface, and the error channel is not a
configuration log); moving the thresholds to a server-controlled remote config service (the app already has
one reviewed flag rail with a guardrail that fails when a flag has no consumer).

## Consequences

- Retuning inside the measured envelope - floors, bands, dwell, penalty, window framing, band-pass corners,
  the credit cap and the grace bounds - no longer needs a release. Retuning **past** the clamps, changing a
  check, or changing the native 50 Hz stream (sample rate, payload, the sample contract) still needs a build;
  the report says so explicitly.
- A published change reaches an app at mount or on the next foreground, whichever sees a settled flag fetch;
  until then the previous configuration (or the shipped gate) runs. The rail is also bound to the analytics
  contract: a signed-out or analytics-disabled identity reads no payload and runs the shipped gate.
- The kill switch is a payload value, so it needs the same PostHog access as any other flag change and no
  release; it restores pre-gate behaviour within one foreground pass.
- Because the envelope is narrow, a genuine field finding (a new phone model's sensor scale, a new capture
  showing a threshold too tight) is still a code change: widen the clamp deliberately, with new evidence in
  the module's notes and a new capture in the test suite.
- The effective configuration is reachable from `Runtime.strideGate` and covered by tests, but no UI renders
  it: reading it in the field needs one of the existing debug/recorder surfaces, which this change
  deliberately did not extend.

## References

- `app-next/src/runtime/detection/strideGateConfig.ts` - the shipped defaults, the clamps with their measured
  notes, the invariants, `resolveStrideGateConfig`, the report and `describeStrideGateReport`.
- `app-next/src/runtime/detection/createStrideGateConfigPort.ts` - the flag rail read, the apply, the grace.
- `app-next/src/runtime/detection/StrideRhythm.ts`, `MotionAdapter.ts` - the gate now reads its parameters
  from the config, keeps its legacy constants as re-exports of the shipped set, and drops the raw-stream leg
  under the kill switch.
- `app-next/src/runtime/NativeRuntimeEffects.tsx`, `Runtime.ts`, `createRealRuntime.ts` - the rail read on
  mount and foreground, and `strideGate` on the runtime.
- `app-next/src/domain/walkingMachine.ts` - `WALK_QUALIFY_MS`, `WALK_GRACE_MIN_MS`, `WALK_GRACE_MAX_MS`.
- Tests: `app-next/src/runtime/detection/__tests__/strideGateConfig.test.ts` (clamps, rejections,
  invariants, grace contract), `strideGateEnvelope.test.ts` (the loosest and strictest admissible payloads on
  the real captures), `strideGateShippedTrace.test.ts` + `fixtures/strideGateShippedTrace.json` (the shipped
  defaults replay the recorded pre-configuration traces exactly), `createStrideGateConfigPort.test.ts`,
  `MotionAdapterGate.test.ts`.
- `guardrails/flag-consumers.test.ts` - one consumer chain per registered flag, including this one.
- [0032: PostHog flag rails with one production consumer per registry entry](0032-posthog-flag-consumers.md)
  - **accepted** (the rail and guardrail shape this builds on).
- The `gate-fix-s3`, `gate-proof-s1` and `gate-fix-s2` reports (firstmate task data, not in this repository)
  carry the measured distributions, the verdict runs and the capture provenance behind every clamp note.
