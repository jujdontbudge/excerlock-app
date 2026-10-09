---
status: proposed
date: 2026-10-09
---

# 0074: Windowed treadmill evidence and its OTA boundary

## Decision

Round 2 replaces the round-1 six-second window and two-second hold with a four-second window and a 500 ms hold, evaluated every 250 ms. Classification stays in TypeScript on-device. This improves the supplied session to five of six walking clips passing and zero of ten negative clips passing. It is **NO-GO for the owner's complete goal**: the short slow-walking take does not pass, and the production one-shot scan cannot stop Progress after a subsequent stop.

Keep all 18 uploaded clips at their original lengths. No re-recording, padding, looping, or exclusion. Use the owner's confirmed recording order: takes 1–13, 15–17, 19–20. Takes 14 and 18 are absent. The owner guarantees take 19 starts walking around 12 seconds and take 20 stops around 13 seconds. The earlier 15/16 swap is withdrawn: head movement in a crop that excludes feet is insufficient evidence to override order. Renamed copies and extracted trajectories were remapped locally, and all 18 copies were checked against original SHA-256 hashes. Originals remain untouched; footage and trajectories never enter git or leave this machine.

## Model

- Use only confident face coordinates on build 17. Optional shoulders require explicit native face/body association; build 17 does not supply it. Independent largest-face/largest-body selection cannot safely associate a background walker.
- Divide vertical displacement by a fixed median face height for each window, resample at 30 Hz, smooth over three samples, subtract a centered one-second moving mean, and discard half-second filter edges. Do not divide each frame by its changing face size.
- Retain the 1.2–2.5 Hz step band. Require Pearson correlation at one step and two steps to both exceed 0.5. One shared threshold replaces independent r/r2 floors and the unstable half-window cadence comparison. Very short halves contain too few cycles to estimate cadence reliably.
- Require three complete cycles, cycle amplitude coefficient of variation at most 0.65, and no cycle below one quarter of the mean amplitude. The four-second window leaves approximately 2.6 seconds after sampling/filter margins, enough for three cycles at the lower step band. A further half-second hold requires three qualifying evaluations. Earliest pass is approximately 4.5 seconds, plus sampling alignment/initial coverage. The 3.3-second slow clip cannot satisfy this model. This is a conservative model minimum, not a claim that physics makes every shorter classifier impossible.
- Require normalized RMS at least 0.015 and 10–90% range at least 0.04; reduce the correlation variance floor consistently to 0.000025. Round 1's RMS 0.03 rejected the low-bob normal walk. Current thresholds have a local stable neighborhood, not a universally demonstrated walking/non-walking gap.
- Retain 85% occupied 100 ms bins, maximum 200 ms gap, timestamp freshness, framing-jump resets, and recent one-second motion. Bin count now derives from window duration rather than assuming 60 bins.
- Do not latch the detector's successful result forever. Subsequent samples or stale coverage can revoke the result. **The controller still stops the camera and finishes on its first pass.** Detector revocation in replay is not wired to continued Progress or Screen Time relock.

No appearance, shirt color, room feature, clip identity, absolute head position, or per-person threshold is used. No learned image weights or native model were changed. The application bundle is rebuilt by Metro; no native rebuild is needed for this candidate.

## Evidence and parameter selection

Shipped / round-1 / final walking passes: 4/6 / 2/6 / 5/6. Negative passes: 5/10 / 0/10 / 0/10. Final brisk, rails, talking and looking pass at 4.55–4.58 seconds; normal passes at 13.41 seconds, within its clip but outside a ten-second target. Slow remains unclassified. Take 19 first passes at 15.22 seconds, about 3.22 seconds after the approximate start, with no earlier pass. Continuous detector replay of take 20 passes at 4.55 seconds and first loses its walking result at 13.34 seconds; no later pass occurs. The app itself does not observe that stop.

The corrected deliberate-bob take lasts only about four seconds. It never passes, but that outcome is censored by the minimum window; it does not demonstrate semantic rejection of sustained deliberate imitation. Three other negatives also end before the minimum pass time. All negatives were replayed through their full actual length, not stopped at an arbitrary deadline.

Exploration compared 3.5/4/4.5-second windows, correlation floors, holds, and amplitude floors. The committed audit then evaluates correlation 0.4/0.5/0.6 × RMS 0.01/0.015/0.02. Each leave-one-take-out fold chooses using the other 17 takes and eight scan-start offsets (0, 50, 100, 150, 200, 250, 500, 1000 ms). An unsafe outcome costs 1000; a missed walk costs 1; ties choose the central prior. Every fold selects 0.5/0.015. The only held-out miss is the short slow clip at all eight offsets; all negative and transition folds satisfy the replay criterion. Stop evaluation allows one second of latency from the approximate boundary. These are exploratory folds after feature design on this session, not untouched test data or population validation.

All nine alternatives retain the five-walk result at the original start; across all offsets the center yields only the eight unavoidable slow-clip misses. At higher correlation/amplitude settings, normal walking becomes sensitive to evaluation alignment. The audit exposes these losses rather than declaring every nearby setting equivalent. Coordinate/face-size transformations at 0.8/0.9/1 preserve every first-pass time exactly, demonstrating mathematical scale invariance only.

### Generalisation argument and limits

Fixed face scaling removes first-order camera distance/body-size dependence. Centered drift removal tolerates slow repositioning without fabricating oscillation from box-size changes. Repeated cycles, lag recurrence, consistent amplitudes and recent motion describe locomotor dynamics rather than appearance. Coverage and association gates avoid inventing evidence from dropouts or another person.

These mechanisms motivate reuse across people; they do not establish it. Head stabilization, gait speed, disability, camera pitch, talking and Vision tracking accuracy vary. The normal-walking result is late, and continuous results can drop during talking/looking even while walking. One person's repeated takes and affine transforms cannot measure these population errors. A person with planted feet can imitate face trajectories; identical observable input must produce the same decision. Build 17's cropped upper-body payload cannot guarantee rejection of all deliberate bobbing.

## OTA boundary and unresolved work

Shippable application changes are TypeScript only. Native modules, targets, dependency versions, runtime version, storage schemas and analytics are unchanged. Local audit/extractor tools are not in the app bundle. No camera or motion details were added to analytics, production logs or the server.

Still not satisfied: all-six walking acceptance, a prompt normal-walking pass, demonstrated sustained deliberate-bob rejection, generalisation to other people, and actual stop-dependent Progress/enforcement. Changing the detector cannot solve continuous observation after the controller closes capture. Foreground continuous observation would require lifecycle/Progress integration; observing while other apps are foreground cannot be supplied by an ordinary iOS background camera OTA. Do not silently convert that limitation into a claim of continuous verification.

Needs a binary for additional camera payload capabilities: explicit subject association, lower-body joints, background-motion estimation, capture timestamps and explicit empty frames. The separately reported build-17 suspended-expiry defect (#164) remains outside this detector change. Such capabilities are not a guarantee of perfect classification and need their own verification.

## Verification

See [SESSION-ONE.md](../../tools/gait-eval/SESSION-ONE.md) for exact local evidence and reproduction commands. Static checks pass. Production-controller replay confirms first-pass timing; full-stream detector replay measures revocation. Simulator proofs are blocked by the installed worker binary's `Cannot find native module 'ExpoUpdates'` startup error after the initial Open prompt was dismissed. No native rebuild, push, merge or OTA publication was performed.

## References

- [Recording protocol](../../tools/gait-fixture-extractor/RECORDING.md).
- [Windowed detector](../../app-next/src/packages/unlock/lib/gait/WindowedGaitDetector.ts), [controller](../../app-next/src/packages/unlock/lib/gait/TreadmillScanController.ts), [reproducible audit](../../tools/gait-eval/audit.ts).
- [Head movement control during treadmill walking](https://pubmed.ncbi.nlm.nih.gov/12443952/): task-dependent head stabilization, not validation of these thresholds.
- [Monocular gait measurement](https://www.nature.com/articles/s41598-021-93530-z): lower-body pose under studied geometry; not validation of cropped-face imitation rejection.
- ADRs 0035 and 0073 remain unchanged; phone-motion detection and background enforcement are separate from this camera-only model.
