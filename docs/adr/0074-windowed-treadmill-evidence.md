---
status: accepted
date: 2026-10-12
---

# 0074: Continuous treadmill qualification from two-axis face motion

## Decision

Keep camera classification on-device in TypeScript, using the existing build-17 face payload. Combine vertical step recurrence with lateral stride recurrence. Continue observing after qualification, revoke it on stopped/stale evidence, and reacquire only through fresh qualifying windows. Camera-derived qualification is foreground-only: closing the screen or backgrounding cancels it. This replaces the one-shot scan described in the October 9 versions of this ADR.

The owner permits the 3.3-second slow-walking take and four-second deliberate-bob take to be looped for evaluation. Loop the videos locally to 20 seconds and re-extract Vision observations; repeating old trajectories repeats extractor startup latency and fabricates gaps. Keep every other take at its original length. Strict owner-confirmed mapping remains takes 1–13, 15–17, 19–20; start walking is approximately 12 s and stop walking approximately 13 s. Footage, frames and trajectories remain local and uncommitted.

## Observations and model

Every supplied take crops out the legs; the existing Vision trajectories contain no confident body joints. The normal and slow walks show stronger lateral motion than vertical bob. Looking and talking while walking change distance/face size. Negative head turns have large excursions but irregular recurrence. These observations motivated a two-axis temporal model, without appearance, absolute face position, background identity or per-take rules.

- The four-second vertical path uses fixed median face scale, 30 Hz interpolation, three-sample smoothing, centered one-second drift removal and discarded filter edges. Step recurrence at 1.2–2.5 Hz needs correlations at one and two steps of at least 0.5, RMS 0.015, 10–90% range 0.04, three complete cycles, amplitude CV at most 0.65 and no cycle below a quarter of mean amplitude.
- The lateral path considers four through eight seconds. Linear detrending preserves slow lateral strides; lag correlation is at least 0.7, with two complete periods and frequency no higher than 1.25 Hz. Lateral RMS must reach 0.15 face heights, vertical/lateral energy ratio must be at most 0.5, and the last 1.5 seconds must retain lateral RMS 0.08. The recent-motion requirement prevents old periodic windows from qualifying a subsequently stationary person.
- Both paths require current two-axis motion after removing a linear trend over 1.2 seconds: combined RMS at least 0.025 face heights. Slow posture drift is insufficient. The face size ratio across a window may reach 2, avoiding rejection of smooth approach/retreat; the independent frame-to-frame jump gate remains 1.5× size or 0.75 face heights displacement.
- Vertical coverage requires 60% occupied 100 ms bins and no gap above 200 ms. Lateral windows require at least 6.5 samples/s and the same gap/edge bound. This accepts the evaluated deterministic frame drops without interpolating over longer absences. Timestamp freshness, sequence checks, empty frames, jump resets and optional native corroboration remain enforced.
- Initial qualification requires 500 ms of qualifying evaluations. Once qualified, a candidate still in its hold may maintain continuity. Uncertain rhythm gets at most 2.5 seconds of continuity; explicit stillness, invalid timestamps, framing jumps and missing coverage revoke immediately. Freshness is polled every 200 ms. The detector no longer expires permanently after 30 seconds; the controller retains a 30-second initial acquisition timeout.

The slow clip qualifies at 7.78 s after looping, versus roughly 4.5 s for the other five walks. The start transition qualifies 3.22 s after the approximate onset. The stop transition loses controller qualification 1.41 s after the approximate stop without reacquisition. All six original/authorized-loop walking replays retain qualification after acquisition. See SESSION-ONE.md and LOOP-LOG.md for measured evidence and intermediate failures.

## Controller and Progress integration

The controller keeps capture and subscriptions alive after its first pass. Serialized qualification callbacks and generation checks prevent an asynchronous pass from surviving cancellation. Loss invokes the walking adapter's cancellation path; the adapter retains ownership of a successful propped scan so a later stop can revoke it. Cancellation uses `coverageLost`, which clears an already-qualified propped state as well as a pending scan. Subsequent acquisition starts a new scan generation. Closing/backgrounding also revokes; switching explicitly to handheld walking preserves the handheld path.

A currently qualified propped state participates in measured walking duration. Revocation closes that interval through the existing serialized DetectionService commit, so camera-derived Progress does not continue through a stopped interval. No storage keys, native module contracts, analytics schemas or server contracts change.

An ordinary iOS camera cannot continuously verify someone while another application is foreground. This implementation does not retain an unobserved camera grant after leaving the screen. It does not claim background camera access, native shield timing, or repair the separately tracked suspended-expiry defect. No binary-only camera capability is introduced.

## Robustness and evidence limits

The final audit selects vertical correlation/RMS and lateral correlation in leave-one-take-out folds, with eight start offsets. The separate full-stream controller audit covers mirror, 0.8× scale plus translation, 1.1× crop transform, deterministic drops of every fifth/third frame, timestamp jitter, coordinate noise, speed ±15%, and seven additional start offsets. These are correlated transforms of one person's recordings, not extra subjects. Feature design used this session; the folds do not constitute untouched population validation.

Loop seams are repeated observations and contribute to the slow clip's recurrence. The exact 7.78-second result does not establish performance on a naturally recorded long slow walk. The deliberate-bob loop is rejected from observed motion rather than clip-length censoring. Other negative clips shorter than acquisition remain censored. A deliberate imitation with identical observable face trajectories remains indistinguishable; this is a camera-motion classifier, not proof of foot contact.

All application changes use existing JavaScript-facing capabilities. The detector/controller changes require no new native module and can be ported to build 17's compatible JS runtime. Publishing this entire checkout to build 17 is a separate compatibility question: current `app.config.ts` pins runtime 4 and explicitly forbids delivery to runtime-3 binaries. No OTA, upload, push or merge is authorized or performed here.

## References

- [Session results](../../tools/gait-eval/SESSION-ONE.md), [iteration log](../../tools/gait-eval/LOOP-LOG.md).
- [Windowed detector](../../app-next/src/packages/unlock/lib/gait/WindowedGaitDetector.ts), [lateral features](../../app-next/src/packages/unlock/lib/gait/LateralGait.ts), [continuous controller](../../app-next/src/packages/unlock/lib/gait/TreadmillScanController.ts).
- [Parameter audit](../../tools/gait-eval/audit.ts), [controller robustness audit](../../tools/gait-eval/robustness.ts).
- ADR 0016 governs exact interval accounting. ADRs 0035 and 0073 govern the separate phone-motion/background paths.
