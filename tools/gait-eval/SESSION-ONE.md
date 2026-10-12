# Session-one detector implementation — round 2, 2026-10-12

Implemented on branch `treadmill-loop`. All six walking takes qualify; zero of ten negative takes qualify. The start transition qualifies at 15.22 s (3.22 s after the approximately 12 s onset). The stop transition revokes qualification at 14.41 s (1.41 s after the approximately 13 s stop), without reacquisition. All 19 evaluated variants retain qualification throughout each observed walking segment after acquisition. These are production-controller replay results, not observed physical Screen Time shield timings.

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

The stop stream drives the real propped-state reducer and WalkingDurationLedger through production-controller callbacks. Its final measured segment ends at 14.347 s; the remaining clip through 18.113 s has `verified: false` and adds no camera-derived Progress. DetectionService integration is implemented and statically checked. The three focused simulator proofs pass with the fresh local binary; physical Screen Time enforcement remains outside simulator evidence.

## Design

Vertical recurrence remains the fast path. Four-to-eight-second lateral recurrence handles slow/low-bob walking, with fixed face scaling, linear drift removal, two observed periods, amplitude/axis-ratio floors and recent motion. Current two-axis detrended motion distinguishes stopped posture drift from ongoing walking. Bounded 3.5-second continuity tolerates uncertain rhythm while explicit stillness and stale/invalid frames revoke immediately. Capture does not stop at first qualification. Cancellation/backgrounding closes the camera grant; later walking reacquires through fresh windows. Persisted camera-only qualification is invalidated when DetectionService starts again, at its last observation rather than inventing an interval through process downtime.

The screen says to keep it open and provides “Stop treadmill scan.” Camera-derived qualification ends when the screen closes or the app backgrounds. Ordinary iOS background camera access is not supplied by this implementation. The separate handheld path remains available.

## Robustness

- **18/18 leave-one-take-out folds pass at all eight start offsets** (144 held-out outcomes). Each fold selects among 27 combinations of vertical repeat correlation, vertical RMS and lateral correlation using the other 17 takes. Every fold selects the central 0.5 / 0.015 / 0.7 settings.
- **342/342 controller acceptance cases pass**: 18 clips × 19 variants. Variants are original, mirror, 0.8× scale with 0.05 offset, 1.1× crop transform, dropping every fifth/third frame, timestamp jitter (±4 ms), seeded coordinate noise (±0.15% of face height per axis), speed 0.85×/1.15×, start offsets 50/100/150/200/250/500/1000 ms, and separately extracted 20 fps and 15 fps capture videos. Every variant passes 18/18 cases.
- **Mid-walk qualification losses: 0** across every variant, including the walking segments of the start/stop takes. Acceptance now requires uninterrupted qualification after acquisition, zero negative acquisition, start acquisition only after the labelled onset and within five speed-adjusted seconds, and stop revocation within three speed-adjusted seconds without reacquisition. A failure makes the evaluator exit nonzero.
- The six previously failing walking variants are fixed by removing the bin-phase coverage alias, distinguishing weak vertical motion from two-axis stillness, and bounding uncertain rhythm continuity at 3.5 seconds. Maximum sample gaps and window edges remain 200 ms; true stillness, invalid/stale samples and framing jumps still revoke immediately. The original stop latency remains 1.41 seconds. Capture-20 stop revokes at 14.510 s; capture-15 at 14.477 s. Optional camera/knee corroboration keeps its existing coverage and rejection checks.
- Lifecycle replay passes: synthetic walking stays qualified past 30 s to 40 s; a two-second missing-sample interval revokes at 12.2 s and reacquires at 18.6 s; end-of-stream stale coverage revokes; cancelling a pending asynchronous pass leaves no grant and an idle controller.

Feature design used this owner's session. These folds and transformations do not demonstrate unseen-person generalisation. The slow clip's recurrence includes repeated loop seams; its 7.78-second result is not an independent long slow-walking observation. Deliberate bobbing is now observed for 20 s and rejected on motion, rather than merely ending before acquisition. The other short negatives remain duration-censored.

## Loop seams

Only slow walking and deliberate bobbing were looped, under the owner's new permission. Videos were transcoded locally with ffmpeg and Vision re-extracted the actual repeated videos. Original files and original trajectories remain untouched.

- `walk-session-one-slow-head.MOV`: original duration 3.300 s; seams at 3.300, 6.600, 9.900, 13.200, 16.500, 19.800 s.
- `bob-session-one-deliberate.MOV`: original duration 4.032 s; seams at 4.032, 8.063, 12.095, 16.127 s.

## Verification and evidence

Everything below is local to `/Users/johansardar/ExcerLock-worktrees/treadmill-loop/` unless specified otherwise. In the evidence bullets, `round-2/` abbreviates `.excer/treadmill-loop/round-2/`.

- `./excer check`: **22 passed**, `round-2/check.txt`.
- Evaluator typecheck: **passed**, `round-2/eval-typecheck.txt`.
- Full production-controller/Progress replay: **342/342**, `round-2/final-robustness/report.json`.
- 27-candidate/18-fold/eight-offset audit: **all pass**, `round-2/final-audit/audit.json`.
- Lifecycle evidence: **passed**, `round-2/lifecycle/report.json` and `round-2/lifecycle.txt`.
- Regression baseline and root cause: `round-2/baseline/report.json`, `round-2/loss-diagnosis.json`, `round-2/diagnosis.txt`.
- Source/input hashes and tested implementation commit: `round-2/manifest.json`.
- Capture provenance: `round-2/captures/captures.json`; videos and extracted trajectories in its `capture-20/` and `capture-15/` directories. ffmpeg selects the requested video cadence before Vision extraction, which retains measured processing time and dropped frames. These are sampled-video variants, not measurements of an iPhone's capture latency.
- `walking/treadmill-screen`: **passed**, `.excer/proof/walking/2026-10-12_20-27-24/` (refreshed without the initial simulator warning).
- `walking/treadmill-windowed-pass`: **passed**, `.excer/proof/walking/2026-10-12_20-25-30/`.
- `walking/treadmill-stop-relocks`: **passed**, `.excer/proof/walking/2026-10-12_20-26-26/`. Its action screenshots establish unlocked → continued scan → stopped/unqualified before navigating Home. The Home evidence shows Locked and Check walking. GaitFake holds the final associated landmarks stationary after 16 seconds and continues emitting fresh samples, distinguishing stopped motion from missing frames.

Every proof invocation has an outer 300-second limit. The fresh binary closes the round-1 `ExpoUpdates` startup blocker. The initial screen proof passed but contained a location warning from the fresh simulator; a simulated location was set and the screen proof was refreshed. No app error was suppressed or production capability replaced.

The originally assigned UDID had already been deleted. Recreated only `ExcerLock-treadmill-loop` in the hidden worker set as **E2C6C22C-2BD7-4F01-81CF-988E038B892F**, retaining Metro **8093** and Screen Time services. T3 cannot expose hidden-set simulators; all device driving used `./excer` on that named worker. No lead device or other worker was used. After verification, the replacement worker simulator was shut down/deleted and its Metro process stopped (`round-2/cleanup.txt`); the binary and build caches remain in the worktree.

Fresh binary: `app-next/build/DerivedData/Build/Products/Debug-iphonesimulator/ExcerLock.app` (also available at the worktree-local `app-next/build/ExcerLock.app` symlink). Native generation, pods, DerivedData and outputs are inside this worktree. Xcode Debug/arm64 generic-simulator build: **BUILD SUCCEEDED**, `round-2/build.txt`, `round-2/build.xcresult`. The generated module list registers `UpdatesModule`; `round-2/binary.json` records the matching built/installed executable hashes. This is not a TestFlight or release archive.

## Reproduce

```sh
npx tsx tools/gait-eval/prepare-looped.ts ~/Movies/treadmill-clips/review-session-one ~/Movies/treadmill-clips/session-one .excer/treadmill-loop/prepared
npx tsx tools/gait-eval/prepare-capture.ts .excer/treadmill-loop/prepared ~/Movies/treadmill-clips/session-one .excer/treadmill-loop/prepared .excer/treadmill-loop/captures
npx tsx tools/gait-eval/audit.ts .excer/treadmill-loop/prepared .excer/treadmill-loop/repeated-audit
npx tsx tools/gait-eval/robustness.ts .excer/treadmill-loop/prepared .excer/treadmill-loop/repeated-robustness .excer/treadmill-loop/captures
npx tsx tools/gait-eval/lifecycle.ts
npx tsc --noEmit -p tools/gait-eval/tsconfig.json
EXCER_SIM=ExcerLock-treadmill-loop EXCER_METRO_PORT=8093 ./excer check
EXCER_SIM=ExcerLock-treadmill-loop EXCER_METRO_PORT=8093 ./excer prove walking --proof treadmill-screen
EXCER_SIM=ExcerLock-treadmill-loop EXCER_METRO_PORT=8093 ./excer prove walking --proof treadmill-windowed-pass
EXCER_SIM=ExcerLock-treadmill-loop EXCER_METRO_PORT=8093 ./excer prove walking --proof treadmill-stop-relocks
```

Re-extraction measures macOS Vision timing and can shift exact milliseconds; use the hashed retained trajectories for exact replay. No footage, frames or trajectories are committed or uploaded.

## Binary / OTA boundary and commits

The detector, controller and Progress integration are TypeScript-only and require no new native capability beyond build 17's face samples. They can be ported into build 17's compatible JS runtime. **This checkout is runtime 4; do not publish its bundle to a runtime-3 build 17.** The current app config explicitly requires a matching binary after the existing SDK patch changes. Live iPhone camera timing, native Screen Time enforcement and background suspension remain unverified here.

- `3970160c`: two-axis gait and decision record.
- `9ee8fa68`: continuous qualification, cancellation, Progress integration and audits.
- `a1c80352`: round-1 evidence and tooling.
- `f956aa98`: uninterrupted qualification, stricter robustness acceptance, capture variants and stop-relocks proof.
- The round-2 evidence/documentation commit follows it.

Earlier rounds are preserved in commits `9fe6baff` and `16ea8df4`; their no-loop and one-shot conclusions are superseded for this requested implementation. See [LOOP-LOG.md](LOOP-LOG.md) for the iteration history and [ADR 0074](../../docs/adr/0074-windowed-treadmill-evidence.md) for the design.
