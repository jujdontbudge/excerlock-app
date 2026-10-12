# Session-one detector implementation — 2026-10-12

Implemented on branch `treadmill-loop`. All six walking takes qualify; zero of ten negative takes qualify. The start transition qualifies at 15.22 s (3.22 s after the approximately 12 s onset). The stop transition revokes qualification at 14.41 s (1.41 s after the approximately 13 s stop), without reacquisition. Original walking clips retain qualification after acquisition. These are production-controller replay results, not observed physical Screen Time shield timings.

## Final per-clip results

Times are seconds from clip start. “None” means no qualification anywhere in the complete supplied/authorized-loop stream. Relock means the controller's qualification-loss callback; the native shield is not available in replay.

| Clip | Unlock (s) | Qualification loss / relock (s) |
|---|---:|---:|
| walk-slow-head (20 s loop) | 7.78 | — |
| walk-normal-head | 4.54 | — |
| walk-brisk-head | 4.55 | — |
| walk-rails-wide | 4.55 | — |
| walk-talk-head | 4.58 | — |
| walk-look-wide | 4.58 | — |
| still-odd-angle | None | — |
| still-normal-angle | None | — |
| talk-standing | None | — |
| look-standing | None | — |
| shift-standing | None | — |
| adjust-phone | None | — |
| rails-running-belt | None | — |
| bob-deliberate (20 s loop) | None | — |
| still-odd-repeat | None | — |
| rails-brisk-belt | None | — |
| startstop-start-walking | 15.22 | — |
| startstop-stop-walking | 4.55 | 14.41 |

The stop stream drives the real propped-state reducer and WalkingDurationLedger through production-controller callbacks. Its final measured segment ends at 14.347 s; the remaining clip through 18.113 s has `verified: false` and adds no camera-derived Progress. DetectionService integration is implemented and statically checked; simulator UI/native enforcement evidence remains blocked below.

## Design

Vertical recurrence remains the fast path. Four-to-eight-second lateral recurrence handles slow/low-bob walking, with fixed face scaling, linear drift removal, two observed periods, amplitude/axis-ratio floors and recent motion. Current two-axis detrended motion distinguishes stopped posture drift from ongoing walking. Bounded 2.5-second continuity tolerates uncertain rhythm while explicit stillness and stale/invalid frames revoke immediately. Capture does not stop at first qualification. Cancellation/backgrounding closes the camera grant; later walking reacquires through fresh windows. Persisted camera-only qualification is invalidated when DetectionService starts again, at its last observation rather than inventing an interval through process downtime.

The screen says to keep it open and provides “Stop treadmill scan.” Camera-derived qualification ends when the screen closes or the app backgrounds. Ordinary iOS background camera access is not supplied by this implementation. The separate handheld path remains available.

## Robustness

- **18/18 leave-one-take-out folds pass at all eight start offsets** (144 held-out outcomes). Each fold selects among 27 combinations of vertical repeat correlation, vertical RMS and lateral correlation using the other 17 takes. Every fold selects the central 0.5 / 0.015 / 0.7 settings.
- **306/306 controller acceptance cases pass**: 18 clips × 17 variants. Variants are original, mirror, 0.8× scale with 0.05 offset, 1.1× crop transform, dropping every fifth/third frame, timestamp jitter (±4 ms), seeded coordinate noise (±0.15% of face height per axis), speed 0.85×/1.15×, and start offsets 50/100/150/200/250/500/1000 ms.
- Acceptance means all walks acquire, negatives never acquire, start never acquires before the labelled onset and acquires within five seconds afterward, and stop revokes within three speed-adjusted seconds without reacquiring. Six augmented walking runs have temporary qualification loss despite passing acquisition: normal with every-third-frame drops and both speeds; rails, talking and looking with every-third-frame drops. All six original/authorized-loop walking runs remain qualified after acquisition. These losses are retained in the JSON report.
- Lifecycle replay passes: synthetic walking stays qualified past 30 s to 40 s; a two-second missing-sample interval revokes at 12.2 s and reacquires at 18.6 s; end-of-stream stale coverage revokes; cancelling a pending asynchronous pass leaves no grant and an idle controller.

Feature design used this owner's session. These folds and transformations do not demonstrate unseen-person generalisation. The slow clip's recurrence includes repeated loop seams; its 7.78-second result is not an independent long slow-walking observation. Deliberate bobbing is now observed for 20 s and rejected on motion, rather than merely ending before acquisition. The other short negatives remain duration-censored.

## Loop seams

Only slow walking and deliberate bobbing were looped, under the owner's new permission. Videos were transcoded locally with ffmpeg and Vision re-extracted the actual repeated videos. Original files and original trajectories remain untouched.

- `walk-session-one-slow-head.MOV`: original duration 3.300 s; seams at 3.300, 6.600, 9.900, 13.200, 16.500, 19.800 s.
- `bob-session-one-deliberate.MOV`: original duration 4.032 s; seams at 4.032, 8.063, 12.095, 16.127 s.

## Verification and evidence

Everything below is local to `/Users/johansardar/ExcerLock-worktrees/treadmill-loop/` unless specified otherwise.

- `./excer check`: **22 passed**, `.excer/treadmill-loop/final-check.txt`.
- Evaluator typecheck: **passed**, `.excer/treadmill-loop/eval-typecheck.txt`.
- Full production-controller/Progress replay: `.excer/treadmill-loop/final-robustness/report.json`.
- 27-candidate/18-fold audit: `.excer/treadmill-loop/final-audit/audit.json`.
- Lifecycle evidence: `.excer/treadmill-loop/lifecycle/report.json` and `lifecycle.txt`.
- CLI replay: `.excer/treadmill-loop/final-eval.txt`; report `.excer/gait-eval/v1/2026-10-12T20-11-15-783Z/report.md`. Its historical 60-clip protocol remains PENDING; that protocol is not the supplied 18-clip acceptance bar.
- Input/source fingerprints: `.excer/treadmill-loop/manifest.json`; loop provenance `.excer/treadmill-loop/review/loops.json`.
- `walking/treadmill-screen`: **blocked**, `.excer/proof/walking/2026-10-12_19-50-02/` and `.excer/treadmill-loop/treadmill-screen.txt`.
- `walking/treadmill-windowed-pass`: **blocked**, `.excer/proof/walking/2026-10-12_19-58-21/` and `.excer/treadmill-loop/treadmill-windowed-pass.txt`.

Both proofs were individually limited to 300 seconds and exited before that deadline. The first fresh deep link and dev-menu prompts were dismissed. The second proof's labels directly show `[runtime not ready]: Error: Cannot find native module 'ExpoUpdates'`; `.excer/treadmill-loop/simulator.png` also captures the startup error. T3 device tools do not expose this hidden-set simulator, so only the assigned `ExcerLock-treadmill-loop`/8093 was driven through `./excer`. The installed dev binary has updates disabled; no compatible cached build was found in this worktree or standard DerivedData. The missing native module cannot be supplied by changing detector JavaScript. No production update fallback was weakened to bypass startup. `.excer/treadmill-loop/binary-inspection.json` records the inspected metadata. No native rebuild was performed.

## Reproduce

```sh
npx tsx tools/gait-eval/prepare-looped.ts ~/Movies/treadmill-clips/review-session-one ~/Movies/treadmill-clips/session-one .excer/treadmill-loop/prepared
npx tsx tools/gait-eval/audit.ts .excer/treadmill-loop/prepared .excer/treadmill-loop/repeated-audit
npx tsx tools/gait-eval/robustness.ts .excer/treadmill-loop/prepared .excer/treadmill-loop/repeated-robustness
npx tsx tools/gait-eval/lifecycle.ts
npx tsc --noEmit -p tools/gait-eval/tsconfig.json
EXCER_SIM=ExcerLock-treadmill-loop EXCER_METRO_PORT=8093 ./excer gait eval .excer/treadmill-loop/prepared/trajectories --labels .excer/treadmill-loop/prepared/labels.json
```

Re-extraction measures macOS Vision timing and can shift exact milliseconds; use the hashed retained trajectories for exact replay. No footage, frames or trajectories are committed or uploaded.

## Binary / OTA boundary and commits

The detector, controller and Progress integration are TypeScript-only and require no new native capability beyond build 17's face samples. They can be ported into build 17's compatible JS runtime. **This checkout is runtime 4; do not publish its bundle to a runtime-3 build 17.** The current app config explicitly requires a matching binary after the existing SDK patch changes. Live iPhone camera timing, native Screen Time enforcement and background suspension remain unverified here.

- `3970160c`: two-axis gait and decision record.
- `9ee8fa68`: continuous qualification, cancellation, Progress integration and audits.
- Final evidence/tooling commit follows these two commits on `treadmill-loop`.

Earlier rounds are preserved in commits `9fe6baff` and `16ea8df4`; their no-loop and one-shot conclusions are superseded for this requested implementation. See [LOOP-LOG.md](LOOP-LOG.md) for the iteration history and [ADR 0074](../../docs/adr/0074-windowed-treadmill-evidence.md) for the design.
