# Treadmill mode — propped-phone walking verification

Status: implemented in app-next; issue #163 changes the scan and completes the deadline. Physical-device release checks remain. See ADR 0062. Parent tracking issue: #111.

## Problem

The Walk & Scroll condition (`walking-state`) holds shields open while the user is verifiably
walking. Verification is cadence-based: CoreMotion must classify the device as walking and the
pedometer must report at least 65 steps/min across two consecutive samples.

That works whenever the phone travels with the body — including on a treadmill, which is already
asserted by test (`NativeMotionProvider.test.ts:26`, "accepts indoor or treadmill walking"). It
fails in exactly one configuration: **the phone propped on the treadmill console or a nearby desk
while the user walks.** A stationary phone reports zero steps, so the session ends even though the
user is genuinely exercising.

This is a common home-treadmill and walking-pad posture, and today it is unserved.

## Scope

- Applies **only** to the `walking-state` condition (Walk & Scroll).
- `steps-rate`, `steps-goal`, and `workout-duration-goal` are unchanged and continue to rely on
  step and workout signals.
- **Treadmill mode earns nothing.** State conditions never bank allowance — the ledger is explicit
  about this (`packages/ledger/src/types.ts:41-42`, "states never bank"). Treadmill mode is purely
  an access gate, identical in that respect to ordinary Walk & Scroll.

## Platform constraints that shape the design

These are hard iOS limits, verified before designing:

1. **A backgrounded app cannot use the camera.** Exemptions are iPad Stage Manager and VoIP
   video-conferencing apps only. While the user is in another app, camera verification is
   impossible.
2. **An app cannot bring itself to the foreground.** There is no self-launch or focus-steal API.
   The only way to reach our UI is the ManagedSettings shield, which replaces the blocked app and
   requires a user tap.
3. **There are no cross-app overlays.** An approval prompt cannot be drawn on top of another app.
4. **A stationary phone reports no steps**, so pedometer verification is unavailable while propped.
5. **DeviceActivity scheduling has a 15-minute floor**, which is why `WALK_INCREMENT_MINUTES = 15`
   already exists in the ledger.

Consequence: while the phone is propped and the user is in another app, **we have no live signal at
all**. The design therefore grants a bounded lease from a foreground camera scan, rather than
attempting continuous verification.

## Entry

There is no persistent per-condition setting and no toggle on the card.

- Walking with the phone **in hand** — treadmill or outdoors — continues to work automatically
  through the pedometer. Nothing changes and nothing is opt-in.
- Propping the phone requires **explicitly starting propped mode in the app**. That deliberate act
  is what authorises the camera path.

## State machine

States and the transitions between them:

### `SCANNING` — initial camera verification

Entered by starting propped mode. The app is in the foreground, phone already propped and facing
the user.

- Front camera runs Vision body-pose detection, looking for vertical oscillation of the shoulder
  and hip landmarks in the 1.2–3 Hz band.
- **Six-second window plus two-second hold**, evaluated every half second in a single scan of up to 30 seconds. Earliest pass is about eight seconds. Live progress ring, auto-dismiss on success, no tap required.
- Camera session is torn down the instant confidence is reached.
- On success → `PROPPED`.
- On failure → see *Failure handling*.

### `PROPPED` — verified, phone stationary, user free to leave the app

- No re-verification while propped. The treadmill is assumed to still be running.
- **A 15-minute lease** runs from the scan. At expiry the shield returns and a new scan is required.
- **30 seconds before expiry**, a notification warns the user. This lets them pick the phone up
  first, which may verify them by motion and skip the camera scan entirely.
- Pickup detected → `HANDHELD`.

### `HANDHELD` — phone in a hand, motion verification

- Pickup is detected from returning micro-tremor and a changing gravity vector, within about a
  second.
- **20-second handoff grace**: the session stays unlocked while waiting for the pedometer to
  establish cadence. Long enough for the signal to settle, short enough that picking up the phone
  and stepping off is caught quickly.
- Once cadence is confirmed, this is ordinary Walk & Scroll verification, and it is *stronger*
  evidence than the camera scan.
- **A successful motion verification resets the 15-minute propped lease.** Users who handle their
  phone periodically are interrupted far less often.
- No cadence by the end of the grace → walking has stopped → normal exit-grace rules apply.
- Put-down detected → `HANDOFF`.

### `HANDOFF` — phone just set down, 60-second window

- Fixed **60 seconds**, not user-configurable — this is a technical handoff window, not a
  preference.
- **Setting the phone down pauses the condition's exit-grace countdown** rather than racing it.
  Placement is a known, benign transition, not evidence of stopping. Without this, a user whose
  condition has a 30-second exit grace would have the session killed before the handoff completed.
- At the end of the window a fresh camera scan is required, which means shielding so the user can
  reach our UI.
- Scan succeeds → `PROPPED`, lease restarts.

### Timings

| Timer | Value | Configurable |
|---|---|---|
| Camera scan | 6s window + 2s hold; 30s cap | no |
| Propped lease | 15 min | tunable constant |
| Pre-expiry warning | 30s before | no |
| Pickup → cadence grace | 20s | no |
| Put-down handoff | 60s | no |
| Condition exit grace | 30s–5min | yes, existing user setting |

## Camera verification

- **Apple Vision `VNDetectHumanBodyPoseRequest`.** On-device, hardware accelerated, ships with iOS,
  nothing to download or train. A custom CoreML model buys nothing here.
- Our own code is signal processing over the returned keypoints: track vertical displacement of
  shoulder and hip landmarks, look for periodicity in the walking band, require consecutive
  qualifying strides before declaring confidence.
- **Efficiency budget**: front camera at 640×480, 15 fps, pose run on every other frame, session
  never outliving the check. Target sustained 15 samples per second across the scan, measured on iPhone 13. If Vision cannot hit that on device,
  drop to 320×240 before extending the duration.
- Multiple people in frame → track the largest, most central body only.

## Failure handling

Never shield silently on a failed scan.

- Cannot see a person, too dark, phone aimed at the ceiling → show **"Can't see you — step into
  frame"** with a live preview, and allow 30 seconds before shielding.
- Camera permission denied → propped mode is unavailable; fall back to ordinary hand-held step
  verification, which needs no camera.
- Camera permission is requested the first time propped mode is started, never at onboarding.

## Privacy

- Frames are processed in memory only. Nothing is written to disk, and nothing is transmitted.
- No recording, no frame retention, no face recognition — body-pose landmarks only.
- The promise on the scan screen: checks that you're walking and grants up to 15 minutes. Deliberate rhythmic imitation remains possible (ADR 0062).

## Architecture

Insertion points, verified against the current tree:

| Concern | Location |
|---|---|
| Condition definition | `packages/condition-model/catalog.ts:84-97` (`walking-state`) |
| State settings shape | `packages/condition-model/evaluation-types.ts:46-50` (`{kind, reward, exitGraceMs}`) |
| Session ownership | `app/src/home/signals/walkingSessionController.ts:86,103` (hard-keyed to `"walking-state"`) |
| Session start | `walkingSessionController.ts:99-162` (reads `exitGraceMs` at :129) |
| Cadence verification | `app/src/signals/motion/WalkVerifier.ts:75-118`, threshold `constants.ts:5` (65 steps/min) |
| Lease primitives | `packages/ledger/src/walk.ts` — `WALK_INCREMENT_MINUTES = 15`, `planWalkIncrement`, `extendWalkIncrement`, `isWalkWindowActive` — **currently dead code, unreferenced outside the package** |
| Current unlock path | `app/src/home/model/lockState.ts:54-55` (UI-level: `liveStates.length > 0`) |
| Entry point UI | `app/src/home/components/cards/StateCard.tsx:34-40` |
| Wiring | `app/src/home/screens/HomeScreen.tsx:155` |

Note: `location.startWalkKeepAlive()` (`walkingSessionController.ts:127`) **must be retained** for
treadmill mode. Although there is no GPS movement indoors, it is what keeps the process alive to
receive motion events in the background — which is how pickup is detected at all.

## Testing

Mirrors the existing `MotionProvider` pattern, which is how the walk verifier is tested today.

- **`GaitVisionProvider`** interface with a **fixture implementation** emitting synthetic
  upper-body keypoint streams. All decision logic — stride periodicity, confidence, timeouts,
  state transitions — is testable with no camera and no device.
- The real Vision-backed implementation sits behind that interface; only the thin wrapper needs
  device verification.
- **Fixture corpus, first pass**: Creative Commons stock footage (Pexels, Pixabay, Mixkit),
  converted to keypoint streams. Explicitly licensed, no platform-ToS or biometric-consent
  exposure. Instagram and TikTok are not scraped.
- **Fixture corpus, second pass**: self-recorded clips on a real treadmill. These supply both the
  true propped-console framing and — more importantly — the **reject cases** stock footage cannot
  provide: standing still while scrolling, sitting nearby, an empty treadmill running, a bystander
  walking behind an unoccupied belt.

The reject set matters more than the accept set: it is where cheating lives.

## Known cheat vectors

| Vector | Mitigation | Residual |
|---|---|---|
| Verify, then step off and leave the belt running | 15-minute lease expiry | up to 15 min of unearned access |
| Pick up phone, step off, keep scrolling | 20s cadence grace then shield | ~20s |
| Sit still and scroll to fake cadence (phantom steps) | Apple filters handling noise; **must be verified by test** | unknown until tested |
| Point the propped phone at another walking person | largest-central-body tracking only; no identity check | present — accepted for v1 |

## Out of scope (future upgrades, tracked on #111)

- **Treadmill frame vibration** through the propped phone, which would remove the 15-minute camera
  recheck entirely. Unproven; needs the four-condition recording experiment.
- **FTMS over Bluetooth** — belt speed streamed directly from smart treadmills, background BLE is
  permitted.
- **Headphone motion** (`CMHeadphoneMotionManager`, AirPods Pro/3rd gen/Max, Beats Fit Pro) as a
  body-worn substitute for a watch.
- **Apple Watch companion** — the only signal with guaranteed continuous background sensor access.
