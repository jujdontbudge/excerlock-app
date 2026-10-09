---
status: proposed
date: 2026-10-09
---

# 0074: Windowed treadmill evidence with an explicit release evidence gate

## Decision

Replace the four-peak treadmill scan with six seconds of continuous, scale-normalized evidence and two seconds of consistent qualifying windows. Keep classification on-device in JavaScript. This is an OTA-compatible candidate, not a release GO or a guarantee that all non-walking is rejected.

Use a fixed median face height per window, resample at 30 Hz, smooth, remove slow drift, discard filter edges, and check autocorrelation at a step period and twice that period. Require sufficient amplitude, agreement between the two half-window cadences, and consistent cycle amplitudes. Retain the prior branch's broad margins (r 0.5, r2 0.25, normalized RMS 0.03, range 0.08); these are engineering priors, not population-validated thresholds. Keep a 1.2 Hz lower allowance for slow walking and reduce the upper step band from 3 to 2.5 Hz. Frequency alone cannot distinguish walking from deliberate imitation.

Require motion in the most recent second using the same RMS floor, so an old oscillating window cannot qualify after the visible subject settles. Reset accumulated evidence on framing jumps, invalid timestamps and missing coverage. The six-second window must have 85% occupied 100 ms bins and no gap over 200 ms. Poll freshness while waiting. Serialize camera startup/shutdown and invalidate callbacks by generation when cancelled.

Build 17 chooses the largest face and largest body independently. Therefore shoulders may qualify only with an explicit native `bodyAssociated: true` and no ambiguity. Build 17 has no such field and uses the face track only. This deliberately sacrifices body-only sensitivity rather than allowing a background walker's torso to unlock a stationary foreground subject. Optional camera-motion and knee gates are inherited for future payloads, but are unvalidated and do not exist on build 17.

The evaluator must never report GO on short footage, explicitly unverified labels, missing sessions or unsafe start/stop outcomes. Deliberate bobbing remains separately reported and a positive bob also vetoes GO. A 3-second no-pass clip is censored observation, not evidence of 30-second rejection. The one-shot scan cannot establish continued walking or relock after a later stop.

## Context

Issues #120 and #163 concern incidental treadmill passes. The baseline at 765c01a5 normalizes torso coordinates by a changing per-frame torso height, or a moving median face height, and counts four peaks using the maximum observed sampling gap as tolerance. This can convert scale changes and irregular motion into plausible peaks. It retries five-second scans. The earlier treadmill branch already contained a windowed replacement and local replay tooling; selected files were imported from 07331d0a, without importing its native changes, app version bump, enforcement changes or unrelated CLI changes.

Eighteen owner recordings from one session are 3.30–20.23 seconds, not the required 25–30 seconds. They were inspected as chronological frame sheets; feet, belt, rails and other people are not visible. Exact protocol identification is not possible from that crop. Renamed byte-identical copies and a provisional mapping stay outside the repository. The two background-person takes are the strongest missing-take hypothesis, not an established fact. Several other labels rely on sequence and need owner confirmation.

Against provisional labels, baseline / candidate timely walking passes are 4/6 / 2/6; non-transition negative passes are 5/10 / 0/10. Five of those ten negative clips end before eight seconds, so zero observed passes substantially overstates rejection evidence if described without duration. Both detectors violate both supplied transition labels. Extracted motion suggests the two transition labels may be reversed; supplied labels remain authoritative pending confirmation. No threshold was selected to explain away that contradiction.

The candidate imported unchanged gives the same clip-level passes as the final candidate. An exploratory leave-one-take-out audit varied r across 0.4/0.5/0.6 and RMS across 0.02/0.03/0.04, using a 100:1 unsafe-pass penalty and excluding each evaluated take from threshold choice. Every setting produced the same four passes; all folds retained the center by tie-break. This provides a local sensitivity margin, not external validation. The strong signal labelled stationary overlaps walking, so there is no demonstrated separating gap. Shortening the observation solely to fit abbreviated clips was rejected.

### Physical rationale and limits

- Median face scale removes first-order distance/body-size scaling without injecting framewise scale noise. It does not remove perspective changes or face-box errors when talking/turning.
- Periodicity over several cycles and across halves rejects irregular movement more credibly than peak counting. Head stabilization varies with gaze and locomotor task; very slow or low-bob walkers may be rejected. Research on head/trunk control supports this limitation, not the numerical thresholds.
- Amplitude and confidence floors reject tiny tracking jitter. Clothing, lighting, skin appearance, body proportions, camera elevation and detector accuracy may alter their distributions; this session cannot validate them.
- A recent-motion check reduces stale evidence at stops; it cannot detect a stop whose upper-body movement continues to mimic walking.
- Separate subject identity and static-camera evidence matter. Full-body monocular gait studies use controlled geometry and lower-body information. Their validation does not transfer to a cropped face on a treadmill console.
- A person can deliberately reproduce walking-like face and shoulder trajectories with planted feet. Identical observable payloads necessarily yield identical JS decisions. No threshold model can honestly promise rejection of all such cases from this payload.

## Consequences

All app changes here are TypeScript; native modules, targets, dependencies and runtime version are unchanged. The build-18 extractor snapshots live only under `tools/` and are research-only. They do not add native capabilities to the shipping app. There is no new remote payload, analytics event, server collection or footage upload.

Needs the next binary: face/body association, lower-body joints, camera/background motion, capture timestamps/empty-frame reporting, and the separately reported build-17 suspended-expiry defect (#164). These must be reviewed and verified separately; this branch does not fix suspended Screen Time expiry or bounded propped-access enforcement.

Release recommendation is NO-GO with current labels and evidence. Complete longer sessions one and two, resolve labels with a helper observing feet, freeze settings, then open a genuinely held-out session three. Require zero incidental held-out passes and at least 17/18 walking passes within ten seconds, plus no deliberate-bob or transition violations. Also recruit different bodies, heights, speeds, clothing, lighting, camera positions and mobility patterns. Same-person take-level validation cannot support "for everyone."

On a physical phone verify rails on running belts, actual background walkers, console shake, deliberate bobbing, looking/talking, start/stop, camera interruption, cancellation and background/resume. Separately verify the full native deadline while suspended and real Screen Time relock. Simulator fixtures establish integration only.

## References

- [Recording protocol](../../tools/gait-fixture-extractor/RECORDING.md), including build 17/18 constraints.
- [Windowed detector](../../app-next/src/packages/unlock/lib/gait/WindowedGaitDetector.ts) and [controller](../../app-next/src/packages/unlock/lib/gait/TreadmillScanController.ts).
- Local evidence index: `tools/gait-eval/SESSION-ONE.md`; footage and per-clip labels remain outside git.
- [Modulation of head movement control in humans during treadmill walking](https://pubmed.ncbi.nlm.nih.gov/12443952/): head/trunk coordination and gaze stabilization; abstract evidence, not classifier validation.
- [Algorithm based on one monocular video delivers highly valid and reliable gait parameters](https://www.nature.com/articles/s41598-021-93530-z): stationary camera and pose-based gait measurement in its studied geometry; not cropped-face adversarial classification.
- [Walking on a Vertically Oscillating Treadmill](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0169924): stride and step synchronization to external mechanical oscillation; does not establish a unique walking frequency signature.
- ADR 0035 (accepted): remote stride-gate configuration is a different, phone-motion detector. No flag is added here.
- ADR 0073 (accepted): background walking residency and watchdog leak; not superseded by this camera-only change.
