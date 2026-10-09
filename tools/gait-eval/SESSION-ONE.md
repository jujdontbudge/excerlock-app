# Session-one round 2, 2026-10-09

**NO-GO for the complete owner goal.** Five of six walking takes pass, zero of ten negatives pass, and both transitions have appropriate first-pass timing. The slow take is shorter than the 4.5-second minimum. Continuous detector replay releases after the stop, but the production one-shot camera scan cannot stop subsequent Progress. Generalisation and sustained deliberate-bob rejection are not established. See ADR 0074.

All 18 uploaded clips are retained as recorded. Confirmed strict order is takes 1–13, 15–17, 19–20; takes 14 and 18 are missing. No departures from order. Round-1's 15/16 swap was withdrawn; the owner-guaranteed start/stop labels were corrected. Copies are byte-identical, originals untouched. No footage or trajectories are committed or uploaded.

## Local evidence

- Original footage: `~/Movies/treadmill-clips/raw-session-one/`.
- Corrected copies: `~/Movies/treadmill-clips/session-one/`.
- Confirmed mapping and original SHA-256 hashes: `~/Movies/treadmill-clips/review-session-one/mapping.md` and `mapping.json`.
- Per-clip truth, shipped, round-1 and final timing/reason: `~/Movies/treadmill-clips/review-session-one/comparison.md`; also `.excer/gait-round-two/comparison.md`.
- Complete production-detector stream, production-controller first pass, nine candidate settings, 18 leave-one-take-out folds, eight start offsets and scale-invariance replay: `.excer/gait-round-two/audit.json`.
- Audit console summary: `.excer/round-two-audit.txt`.
- Exploratory window/hold/correlation sweep: `.excer/sweep.json`; expanded correlation neighborhood: `.excer/margins.json`; original timing-grid sensitivity: `.excer/stability.json`. These are exploration, not independent validation.
- Production-controller CLI replay: `.excer/round-two-eval.txt`, which records the timestamped report path.

Final first passes in original order: none, 13.41 s, 4.55 s, 4.55 s, 4.58 s, 4.58 s; none for all ten negatives; 15.22 s for start (~12 s), 4.55 s for stop (~13 s). Continuous detector release in the stop clip is 13.34 s, without reacquisition. No app-level stop/enforcement claim follows from that replay.

The deliberate-bob take is only about four seconds and never reaches the minimum pass time. It is a censored no-pass, not demonstrated rejection of a sustained imitation. Do not remove, loop or pad it. Low-bob normal walking passes late, and talking/looking can lose continuous qualification while still walking. The selected settings improve scan acceptance, not continuous gait sensitivity for everyone.

All 18 leave-one-take-out folds select correlation 0.5 and RMS 0.015. At every one of eight start offsets, held-out outcomes are five of six walks accepted, zero of ten negatives accepted and both detector transition criteria met. Short slow walking fails at every offset. Stop criteria allow one second after the approximate transition. Feature exploration already used this session, so these folds do not validate unseen people. Scale transforms 0.8/0.9/1 preserve every pass time exactly; these are mathematical invariance checks, not more subjects.

## Reproduce

```sh
npx tsx tools/gait-eval/audit.ts ~/Movies/treadmill-clips/review-session-one
EXCER_SIM=ExcerLock-treadmill EXCER_METRO_PORT=8092 ./excer gait eval ~/Movies/treadmill-clips/review-session-one/trajectories --labels ~/Movies/treadmill-clips/review-session-one/labels.json
npx tsc --noEmit -p tools/gait-eval/tsconfig.json
```

The audit writes local candidate modules into its output directory and evaluates original-length trajectories. It never reads or uploads movie bytes. The CLI evaluator now vetoes GO for a missed supplied walking take or any observed negative pass, including calibration clips; an absent held-out session no longer hides those failures. `frozen-settings.json` pins this candidate for reproducibility, not publication approval. Use the existing trajectories to preserve extraction timing; re-extracting with macOS Vision may change timing relative to an iPhone.

## Verification and shipping boundary

- `EXCER_SIM=ExcerLock-treadmill EXCER_METRO_PORT=8092 ./excer check`: 22 checks passed, `.excer/round-two-check.txt`.
- Evaluator typecheck: `.excer/round-two-eval-typecheck.txt`.
- `walking/treadmill-screen`: **blocked** by native startup, `.excer/proof/walking/2026-10-09_17-47-14/` and `.excer/round-two-treadmill-screen.txt`.
- Updated `walking/treadmill-windowed-pass`: **blocked** by the same native startup error, `.excer/proof/walking/2026-10-09_17-48-39/` and `.excer/round-two-treadmill-windowed-pass.txt`.
- Both proofs were individually bounded to 300 seconds and exited with missing labels before the deadline. Screenshots/labels show `[runtime not ready]: Error: Cannot find native module 'ExpoUpdates'`. The first Open prompt was dismissed; no Continue/Close menu was available before this startup failure. No red/green proof claim is made.
- T3 Device tools did not find the hidden worker-set simulator. The existing `ExcerLock-treadmill` simulator and Metro 8092 were used headlessly through `./excer`; no default-set simulator was used or opened. No native rebuild was performed.

Application changes are TypeScript only and OTA-compatible with the existing payload. Additional native subject association, lower-body/background motion and reliable capture timing require a binary. Continuous Progress/enforcement integration and build-17 suspended expiry are unresolved separately. Nothing was pushed, merged or published.

## Round-1 history

Commit `9fe6baff` and its ADR version retain the original reasoning. Baseline report: `.excer/gait-eval/v1/2026-10-09T16-42-22-384Z/report.json`; round-1 report: `.excer/gait-eval/v1/2026-10-09T16-47-16-073Z/report.json`. Historical filenames reflect the superseded mapping: the 15/16 copies and the transition copies have since exchanged names. Compare by original IMG identifier and SHA-256, not the old trajectory path alone. The round-1 local comparison is preserved as `comparison-round-one.md`.
