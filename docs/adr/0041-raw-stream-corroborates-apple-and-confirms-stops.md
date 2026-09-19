---
status: accepted
date: 2026-09-18
---

# 0041: The raw stream corroborates Apple's walking legs and confirms stops

## Decision

Three changes to the walking gate, all inside `app-next/src/runtime/detection` and `app-next/src/domain/walkingMachine.ts`:

1. **Apple's legs need a gait-shaped raw window.** While the raw 50 Hz stream is live (an evaluated window
   exists), CMMotionActivity `walking`/`running` and CMPedometer cadence may only qualify when the current
   window is *gait-shaped* (`gaitShapedWindow`: every stride check except periodicity - vertical intensity
   at or above the walk floor, recent RMS above the still floor, step estimate inside the walking band,
   interval regularity, axis purity and rotation ratio inside their bounds) and no veto is inside the 8 s
   penalty. The raw stride verdict itself is unchanged. Without a live raw stream (no source, the kill
   switch, a stale stream, the first 2.9 s) the Apple legs stand alone exactly as before, so the ADR 0035
   kill switch still restores the pre-gate behaviour.
2. **A measured stop ends relief.** `StrideAssessment` carries `stillSince`, the start of the first still
   window of the current uninterrupted run of still evaluations. When `at - stillSince` reaches the new
   gate parameter `stillStopMs` (shipped 10 s; remote clamp 5-60 s, hostile end 60 s) the adapter publishes
   `MotionEvidence.stopped = true` with `qualifying: false`, and `reduceWalking` deactivates from any phase.
   A confirmed stop can never coincide with qualifying evidence (the reducer throws) and never exists
   without a live raw stream. The adapter publishes the moment the span is reached, not only on the next
   tick.
3. **Resuming from grace re-verifies.** Positive evidence inside grace no longer flips relief back to
   `active` by itself: it starts the same 3 s qualifier a fresh walk needs (or is satisfied by the raw
   path's `verifiedMs`), relief is kept meanwhile, silence lapses the re-verification, and a
   re-verification that outlives the grace deadline continues as plain verification. Positive evidence
   after the deadline requalifies from scratch.

## Context

Build 6 Home ground-truth reports (PostHog person e626d7a9, 02:40-02:45Z) showed an `unlock_completed
method=walking` while the held label was *shaking*, an unlock in the same second as *sitting*, and a
walking relief that stuck for 79 s after the phone had been put still. Replaying the recorder captures
through the production adapter and reducer (harness under the gitignored `work/wss/`, base = main
6ba99864) reproduced the mechanism on capture f09377f9: the walker stopped at +13.4 s inside a 35 s walking
label, the raw stream measured the phone still at 0.052 g for 17.8 s, and CMMotionActivity kept reporting
`walking:high` (still at +23.0 s) while CMPedometer carried 121 steps/min with a flat counter. The
pre-change gate vetoed only the cadence leg with the raw verdict; the activity leg was unguarded, and a
single positive sample in grace re-activated relief instantly, so relief ran to +57.7 s. The 4-6 s relocks
after sitting in the same log were not the walking machine at all: `PhonePlacementClassifier` `setDown`
resets walking on `putDown` in `DetectionService`.

Measured anchors, all from the recorder captures (`fixtures/strideRhythmCaptures.json` plus the ten
sessions under the firstmate data pull):

- Longest gait-shaped run on any captured shake or seated window: 8 evaluations (2 s), below the 3 s
  qualifier, so Apple's legs can no longer carry a shake to relief. The pocket walk 8b91a77d, whose
  periodicity never clears the stride check (0.2-0.39), is gait-shaped for 59 consecutive evaluations, so
  the Apple path keeps unlocking it (new fixture segment `walkPocketGait`).
- Longest measured stillness inside any captured walking label: 4.8 s (treadmill belt ramps). `stillStopMs`
  ships at 10 s; its remote floor of 5 s keeps a window plus one evaluation over that; its ceiling of 60 s
  exceeds silence plus the shipped grace, i.e. it never fires before the grace would.
- The 3 s re-verification is the existing `WALK_QUALIFY_MS`; a real walker resumes from grace through the
  raw path at once because `verifiedMs` satisfies it.

Replay result, head against base over every capture (second-level, against the captain's labels): overall
accuracy 93.5 % → 96.3 %; false relief 23 s → 14 s; missed walking 72 s → 40 s; the seated-shake false
relief on cd592ea2 (23 s) is gone. The remaining 14 s of false relief are grace tails inside 10 s of a real
walk (a 6 s shake between two walks, an 8 s sitting label at the end of a capture), shorter than the
still-stop span by design. On the f09377f9 case above, relief now ends at +23.4 s (10 s after the measured
stillness began) instead of +57.7 s, while Apple still says walking. One 35 s "walking" label in f09377f9
contains a real 17 s stop and one treadmill label starts 7 s before the belt moves; both now relock inside
the label, which is the requested behaviour and a label artifact, not a regression.

Rejected: requiring the raw `walking` verdict for every unlock (loses the pocket walk, and the kill
switch would then make unlocking impossible); shortening the grace (the grace exists for red lights and
tying a shoe: the phone is not still there, so a measured stop is the right discriminator); anchoring
the stop on Apple's `stationary` classification (8-30 s late, the very lag this fixes).

## Consequences

- A phone put down still relocks 10 s after the stillness began, from active or grace, even inside the
  user's 30 s-5 min stop-grace. A walker who stands motionless at a red light for more than 10 s will
  relock and, on walking again, unlock through the raw path within about 3 s or through Apple's legs after
  the 3 s qualifier; this is the trade the captain asked for ("relock when still"). `stillStopMs` is
  OTA-tunable inside its clamp.
- Apple's activity classifier alone can no longer unlock while the raw stream is live; cold-start unlock
  latency on a walk whose windows are gait-shaped is unchanged (Apple corroborated), and a walk the raw
  stream refuses entirely stays refused until the stream goes stale (the kill switch remains the escape).
- Residual, documented limit: a sustained, regular, gentle three-dimensional bounce at walking tempo can
  still pass the raw `walking` verdict; the dwell and penalty stay OTA-tunable (ADR 0035). The captain's own
  02:44 shake was not recorded by the recorder app, so it is covered by the measured shake captures, not by
  its own trace.
- `fixtures/strideGateShippedTrace.json` was re-recorded once from the current code with a generator that
  first asserted every pre-existing field of every analyzer and adapter row equal to the aa293011 rows;
  nothing else moved. `tools/phone-walking-recorder`'s Swift port of the production classifier covers the
  Apple-only path, which is unchanged: `Fixtures/production-path.json` still passes (run
  `verify-production-parity.ts` with `--tsconfig app-next/tsconfig.json` and `__LINKED_RECORDER_TRACE__`
  defined; the script predates the linked-trace global). The port does not model the raw stream, so it
  carries neither the corroboration nor the stop.
- Motion cannot run on the simulator, so the E2E proof is the replay harness above plus the unit suites;
  the SIM lane covers Home's visible states only.

## References

- Code: `app-next/src/runtime/detection/MotionAdapter.ts` (`reconcile`, `acceptStride`),
  `StrideRhythm.ts` (`gaitShapedWindow`, `stillSince`), `strideGateConfig.ts` (`stillStopMs`),
  `DetectionService.ts` (passes `stopped`), `app-next/src/domain/walkingMachine.ts` (`stopped`,
  grace re-verification).
- Tests: `MotionAdapter.test.ts`, `StrideRhythm.test.ts`, `strideGateConfig.test.ts`,
  `strideGateShippedTrace.test.ts`, `DetectionService.test.ts`, `walkingMachine.test.ts`.
- ADR 0035 (remote stride-gate configuration; `stillStopMs` joins its clamp table) — accepted.
- Issue #144 (standing-still unlock right after a walk: the carried-cadence hypothesis this confirms).
- Firstmate task `walk-shake-stop-w1`; PostHog person e626d7a9, build 6, 2026-09-19 02:40-02:45Z.
