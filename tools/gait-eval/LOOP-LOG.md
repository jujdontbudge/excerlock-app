# Treadmill implementation loop — 2026-10-12

All work is on `treadmill-loop`. Movie bytes, frames and trajectories remain local under `.excer/treadmill-loop/` and `~/Movies/treadmill-clips/`. Labels follow the owner-confirmed mapping, with walking starting at approximately 12 s and stopping at approximately 13 s. The new permission supersedes the original no-loop restriction for slow walking and deliberate bobbing only.

## Inspection and preparation

Inspected extracted contact sheets and x/y face trajectories. Every take excludes feet and has zero confident body landmarks. Normal walking has strong lateral recurrence but weak vertical movement. Slow walking has one broad lateral excursion and camera-distance drift. The two standing-angle takes contain head turns and irregular face tracking, not stable repeated gait. Walking with looking/talking changes face size toward the end; the old whole-window 1.5× size gate incorrectly revoked qualification despite continuous face tracking.

The first exploratory trajectory repetition repeated the extractor's startup latency and created artificial gaps. Discarded that approach: ffmpeg looped the actual two short videos to 20 s and Vision re-extracted both. The exact repeated movie seams remain synthetic; accepting the looped slow clip is not independent evidence for a naturally recorded eight-second slow walk. No clips were relabelled or excluded.

## Iteration 0 — prior detector

Four-second vertical recurrence accepts five walks, with normal walking at 13.41 s. Looped slow walking still fails. No negative passes. Controller stops the camera after its first pass. Local baseline: `.excer/treadmill-loop/iteration-0/` (initial trajectory-loop diagnostic only).

## Iteration 1 — lateral recurrence

Added normalized, linearly detrended lateral recurrence at four/eight seconds, two periods, correlation 0.9, RMS 0.15 and vertical/lateral energy ratio 0.15. Six walks pass, zero negatives pass: slow 8.84 s, normal 4.54 s, others 4.55–4.58 s. Production-detector audit: `.excer/treadmill-loop/iteration-1/`. Initial continuous replay still shows dropouts and seven augmentation failures. Next: tolerate cadence variation and measured frame drops.

## Continuous iteration 1

Continuous callback replay, initial lateral branch. Seven augmentation failures, including dropped-frame walking and faster normal walking.

Evidence: `.excer/treadmill-loop/robustness-1/report.json`.

| Clip | First unlock (s) | Qualification losses (s) |
|---|---:|---|
| walk-slow-head | 8.84 | 11.40, 14.91, 18.08 |
| walk-normal-head | 4.54 | 6.40 |
| walk-brisk-head | 4.55 | — |
| walk-rails-wide | 4.55 | — |
| walk-talk-head | 4.58 | 8.05 |
| walk-look-wide | 4.58 | 8.04 |
| still-odd-angle | — | — |
| still-normal-angle | — | — |
| talk-standing | — | — |
| look-standing | — | — |
| shift-standing | — | — |
| adjust-phone | — | — |
| rails-running-belt | — | — |
| bob-deliberate | — | — |
| still-odd-repeat | — | — |
| rails-brisk-belt | — | — |
| startstop-start-walking | 15.22 | — |
| startstop-stop-walking | 4.55 | 14.08 |

Acceptance failures: 7/306.

## Continuous iteration 2

Use four-to-eight-second lateral windows, correlation 0.85 and axis ratio 0.3; occupancy 0.65. One brisk dropped-frame miss remains.

Evidence: `.excer/treadmill-loop/robustness-2/report.json`.

| Clip | First unlock (s) | Qualification losses (s) |
|---|---:|---|
| walk-slow-head | 7.78 | — |
| walk-normal-head | 4.54 | 6.40, 11.40 |
| walk-brisk-head | 4.55 | — |
| walk-rails-wide | 4.55 | — |
| walk-talk-head | 4.58 | 8.05 |
| walk-look-wide | 4.58 | 8.04 |
| still-odd-angle | — | — |
| still-normal-angle | — | — |
| talk-standing | — | — |
| look-standing | — | — |
| shift-standing | — | — |
| adjust-phone | — | — |
| rails-running-belt | — | — |
| bob-deliberate | — | — |
| still-odd-repeat | — | — |
| rails-brisk-belt | — | — |
| startstop-start-walking | 15.22 | — |
| startstop-stop-walking | 4.55 | 14.08 |

Acceptance failures: 1/306.

## Continuous iteration 3

Occupancy 0.6, lateral correlation 0.8 and axis ratio 0.5. All acceptance variants pass; normal walking still drops qualification.

Evidence: `.excer/treadmill-loop/robustness-3/report.json`.

| Clip | First unlock (s) | Qualification losses (s) |
|---|---:|---|
| walk-slow-head | 7.78 | — |
| walk-normal-head | 4.54 | 6.40, 11.68 |
| walk-brisk-head | 4.55 | — |
| walk-rails-wide | 4.55 | — |
| walk-talk-head | 4.58 | 8.05 |
| walk-look-wide | 4.58 | 8.04 |
| still-odd-angle | — | — |
| still-normal-angle | — | — |
| talk-standing | — | — |
| look-standing | — | — |
| shift-standing | — | — |
| adjust-phone | — | — |
| rails-running-belt | — | — |
| bob-deliberate | — | — |
| still-odd-repeat | — | — |
| rails-brisk-belt | — | — |
| startstop-start-walking | 15.22 | — |
| startstop-stop-walking | 4.55 | 14.08 |

Acceptance failures: 0/306.

## Continuous iteration 4

Lateral correlation 0.7; whole-window face-size ratio 2; existing qualification accepts holding windows. Revealed an unwanted post-stop reacquisition; the release criterion was tightened to forbid every reacquisition after release.

Evidence: `.excer/treadmill-loop/robustness-4/report.json`.

| Clip | First unlock (s) | Qualification losses (s) |
|---|---:|---|
| walk-slow-head | 7.78 | — |
| walk-normal-head | 4.54 | 6.40 |
| walk-brisk-head | 4.55 | — |
| walk-rails-wide | 4.55 | — |
| walk-talk-head | 4.58 | — |
| walk-look-wide | 4.58 | — |
| still-odd-angle | — | — |
| still-normal-angle | — | — |
| talk-standing | — | — |
| look-standing | — | — |
| shift-standing | — | — |
| adjust-phone | — | — |
| rails-running-belt | — | — |
| bob-deliberate | — | — |
| still-odd-repeat | — | — |
| rails-brisk-belt | — | — |
| startstop-start-walking | 15.22 | — |
| startstop-stop-walking | 4.55 | 14.08, 16.45 |

Acceptance failures: 0/306.

## Continuous iteration 5

Require recent lateral motion (1.5-second RMS 0.08). No post-stop reacquisition. All acceptance variants pass; normal walking still loses qualification for two seconds.

Evidence: `.excer/treadmill-loop/robustness-5/report.json`.

| Clip | First unlock (s) | Qualification losses (s) |
|---|---:|---|
| walk-slow-head | 7.78 | — |
| walk-normal-head | 4.54 | 6.40 |
| walk-brisk-head | 4.55 | — |
| walk-rails-wide | 4.55 | — |
| walk-talk-head | 4.58 | — |
| walk-look-wide | 4.58 | — |
| still-odd-angle | — | — |
| still-normal-angle | — | — |
| talk-standing | — | — |
| look-standing | — | — |
| shift-standing | — | — |
| adjust-phone | — | — |
| rails-running-belt | — | — |
| bob-deliberate | — | — |
| still-odd-repeat | — | — |
| rails-brisk-belt | — | — |
| startstop-start-walking | 15.22 | — |
| startstop-stop-walking | 4.55 | 14.08 |

Acceptance failures: 0/306.

## Continuous iteration 6

Bound uncertain-rhythm continuity to 2.5 seconds, with immediate loss for stale/invalid samples and explicit stillness. Normal walking stays qualified; faster stop exceeds its latency limit.

Evidence: `.excer/treadmill-loop/robustness-6/report.json`.

| Clip | First unlock (s) | Qualification losses (s) |
|---|---:|---|
| walk-slow-head | 7.78 | — |
| walk-normal-head | 4.54 | — |
| walk-brisk-head | 4.55 | — |
| walk-rails-wide | 4.55 | — |
| walk-talk-head | 4.58 | — |
| walk-look-wide | 4.58 | — |
| still-odd-angle | — | — |
| still-normal-angle | — | — |
| talk-standing | — | — |
| look-standing | — | — |
| shift-standing | — | — |
| adjust-phone | — | — |
| rails-running-belt | — | — |
| bob-deliberate | — | — |
| still-odd-repeat | — | — |
| rails-brisk-belt | — | — |
| startstop-start-walking | 15.22 | — |
| startstop-stop-walking | 4.55 | 14.94 |

Acceptance failures: 1/306.

## Continuous iteration 7

Add 1.2-second, two-axis linear-detrended recent-motion RMS floor 0.025. Suppresses drifting stationary head motion without treating slow drift as gait. All 306 acceptance variants pass; all six originals remain qualified after acquisition. Stop releases at 14.41 s, 1.41 s after its approximate boundary.

Evidence: `.excer/treadmill-loop/robustness-7/report.json`.

| Clip | First unlock (s) | Qualification losses (s) |
|---|---:|---|
| walk-slow-head | 7.78 | — |
| walk-normal-head | 4.54 | — |
| walk-brisk-head | 4.55 | — |
| walk-rails-wide | 4.55 | — |
| walk-talk-head | 4.58 | — |
| walk-look-wide | 4.58 | — |
| still-odd-angle | — | — |
| still-normal-angle | — | — |
| talk-standing | — | — |
| look-standing | — | — |
| shift-standing | — | — |
| adjust-phone | — | — |
| rails-running-belt | — | — |
| bob-deliberate | — | — |
| still-odd-repeat | — | — |
| rails-brisk-belt | — | — |
| startstop-start-walking | 15.22 | — |
| startstop-stop-walking | 4.55 | 14.41 |

Acceptance failures: 0/306.

## Final verification

27 parameter combinations, 18 leave-one-take-out folds × eight offsets: zero held-out losses. Full production-controller replay: 306/306 acceptance cases pass. The six originals/authorized-loop walks retain qualification after acquisition; six augmented walking runs still have temporary losses, itemized in SESSION-ONE.md. Lifecycle replay passes continued qualification beyond 30 seconds, missing-frame revocation/reacquisition, stale-stream revocation and cancellation during an asynchronous pass. The real propped reducer and duration ledger stop Progress after the stop callback.

`./excer check`: 22 passed. Evaluator typecheck passed. Both requested proofs were individually timeboxed to 300 seconds and exited blocked by the installed binary's missing `ExpoUpdates` native module. No compatible cached binary was found in this checkout or standard DerivedData; no production module was mocked to bypass the error. Details and evidence paths: SESSION-ONE.md.
