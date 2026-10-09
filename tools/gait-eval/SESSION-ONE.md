# Session-one evaluation, 2026-10-09

Release recommendation: **NO-GO**. This is a conservative OTA candidate for review, not ready to publish under an only-real-walking guarantee. See ADR 0074.

## Local evidence

All paths below are on the owner's machine. No recordings or derived trajectories are committed or uploaded.

- Original footage: `~/Movies/treadmill-clips/raw-session-one/` (untouched).
- Byte-identical renamed copies: `~/Movies/treadmill-clips/session-one/`.
- Per-clip mapping, confidence, conflicting observations and SHA-256: `~/Movies/treadmill-clips/review-session-one/mapping.md` and `mapping.json`.
- Chronological 2 fps frame sheets of every clip: `~/Movies/treadmill-clips/review-session-one/IMG_*.jpg`.
- Baseline (shipped peak detector vs imported windowed-1): `.excer/gait-eval/v1/2026-10-09T16-42-22-384Z/report.json`.
- Final production-controller replay on the same extracted trajectories: `.excer/gait-eval/v1/2026-10-09T16-47-16-073Z/report.md` and `report.json`.
- Nine-setting leave-one-take-out audit: `.excer/cross-validation.json`; reproduction script `.excer/cross-validation.mts`.
- Per-window diagnostics: `.excer/windows.json`.

The strongest missing-take hypothesis is the two background-person takes. No second person is visible in any supplied frame sheet. That is not enough to establish the exact missing protocol identities. First-three labels use the owner's sequence anchor; middle labels are provisional. The two transition labels retain the owner's explicit statement despite contrary motion evidence.

## Iteration log

1. Imported the prior branch's JS classifier/controller and evaluation tools selectively. The LegacyDetector differs from the current shipped detector only in formatting/type-import location; LegacyController adds a virtual timer seam. Native files and enforcement changes were not integrated.
2. Baseline: nominal walking 4/6 within 10 seconds; nominal negatives 5/10 passes. Imported windowed-1: walking 2/6, negatives 0/10. Both transition clips pass at unsafe times under supplied labels.
3. Candidate: require explicit shoulder association, upper cadence 2.5 Hz, fresh last-second amplitude, retain prior amplitude/correlation floors. Same aggregate outcomes: walking 2/6, negatives 0/10, both transition violations remain. These safeguards address observable failure mechanisms without fitting to identity or appearance.
4. Exploratory leave-one-take-out: r 0.4/0.5/0.6 × RMS 0.02/0.03/0.04, unsafe-pass penalty 100 vs missed-walk penalty 1. All nine settings produce the same four passes (two nominal walks, two transitions). All 18 folds select the center on ties. This is sensitivity analysis on provisional labels, not population validation. No learned threshold is shipped.
5. Evaluation now blocks GO on durations below 25 seconds, unverified labels, bobbing passes and transition violations. This corrects the imported tool's misleading PENDING classification for unsafe transition passes. Incomplete sessions remain a separate blocker.

Five negatives last less than eight seconds; their no-pass outcomes are censored. Slow and brisk positive takes last 3.30 and 6.33 seconds, shorter than the intended evidence span. Do not loop, pad or duplicate these to manufacture successful detections. Mac Vision extraction uses measured processing delay and can differ from live iPhone sampling and Camera-app stabilization.

## Reproduce

```sh
EXCER_SIM=ExcerLock-treadmill EXCER_METRO_PORT=8092 ./excer gait eval ~/Movies/treadmill-clips/review-session-one/trajectories --labels ~/Movies/treadmill-clips/review-session-one/labels.json
```

Use `session-one/` instead to re-extract video; expect different macOS processing timing. Do not open session three until settings are actually frozen after valid sessions one and two. `frozen-settings.json` currently pins this candidate for reproducibility; it does not certify calibration complete.

## Shipping boundary

App edits are TypeScript only. The optional build18 extractor compiles an archived analyzer under tools, not shipping native modules. Build 17 cannot gain lower-body joints, background flow, reliable face/body association, capture-time timestamps or the reported suspended-expiry fix through this OTA. Continuous walking after a completed one-shot scan is also unproven. Do not advertise or release as rejecting everything else for everyone.

## Verification

- `EXCER_SIM=ExcerLock-treadmill EXCER_METRO_PORT=8092 ./excer check`: all 22 checks passed; `.excer/treadmill-check-final.txt`.
- `npx tsc --noEmit -p tools/gait-eval/tsconfig.json`: passed; `.excer/eval-typecheck.txt`.
- Focused `walking/treadmill-screen`: **blocked**. First attempt stopped at the fresh-install Open prompt; after dismissing it and the dev menu, the installed binary fails with `Cannot find native module 'ExpoUpdates'`. Final attempt: `.excer/proof/walking/2026-10-09_16-52-48/` plus `.excer/metro.log`. Each attempt had a 300-second outer timeout.
- `treadmill-stationary-face` and `treadmill-windowed-pass` proof blocks were added but cannot run through the app until the compatible installed binary is supplied. No red/green simulator claim is made. No rebuild was performed.
- Replay evaluates the production controller, but is not a physical-camera or Screen Time proof.
