# How your plan works — S3b

Presentation only. S3 commits the plan; this step reads the draft and the W1
preference in `profileStore`, and Continue only advances to S4. No detector,
permission, entitlement, shielding, or server mutation is called by this scene.

Source of visual truth: `condition-demo/IMPLEMENTATION-PROMPT.md`, approved HTML,
and Sunburst asset provenance under `condition-demo/gen/`. The soft cards and
illustrated palette deliberately follow that approval instead of normal app
chrome. Assets are copied unchanged; no frames were regenerated.

`model.ts` is the deterministic storyboard/hold reducer. It covers walking state
(outside 8 s; treadmill 13 s), step/minute targets (11 s), gym arrival (13 s), and
gym time (18 s). Step/minute values come from the actual draft, including small
reviewer targets. Saved gym name/radius come from settings. Timings compress the
explanation and never replace the domain's real verification/grace timers.

Reanimated's UI-thread frame callback drives scene time, walking time, parallax,
frame blending, map movement, and progress. All eight canvases in the selected
set stay mounted and decode before the clock starts. At most two walking poses
are visible: opaque current frame plus a linearly blended next frame, full
canvases and fixed feet baseline. The stride and scrolling clock only advance
while walking, including splitting deltas at phase boundaries. React gets phase
changes and at most 10 counter updates per second. Backgrounding stops playback
and releases a hold; unmounting stops the callback. Reduce Motion changes are
observed, suppressing pose crossfades, bobbing, phone dissolves, and confetti.

The native Screen Time shield is an illustration, not a native enforcement
surface. Copy is matched to the bundled shield extension. TikTok marks identify
only the simulated app; no affiliation or integration is implied.

## Deterministic preview port

Only dev/preview builds accept `excerlock://onboarding/S3b?demoTime=7&demoPause=1`.
Production ignores both query parameters. Times must be finite, nonnegative and
strictly less than the selected scenario's duration. The port cannot select a
draft, change a saved rule, or grant access. To select a scenario, use the actual
onboarding questions. A paused scene still accepts the hold interaction. The
status card's native accessibility identifier exposes scenario/place/phase/phone/
locked state without adding diagnostic text to the user-facing copy.

`E2E-D1` in the existing SIM harness selects all six variants, commits through S3,
seeks/captures every phase, tests a real sustained touch and release, records a
10-second walking cycle, checks persisted rules after Continue/Back, and asserts
live PostHog `onboarding_screen_viewed` rows for each scenario/place. It does not
claim native Screen Time or real motion/location enforcement on a simulator.

Run only when the pinned simulator is free:

```sh
python3 app-next/e2e-next/run.py E2E-D1 --run-id condition-demo-<timestamp>
```

New onboarding capability and assets are **new-submission material, never OTA**.
