# How your plan works — S3b

Presentation only. S3 commits the plan; this step reads the draft and the W1
preference in `profileStore`, and Continue only advances to the S3c trial preview. No detector,
permission, entitlement, shielding, or server mutation is called by this scene.

Source of visual truth: `condition-demo/IMPLEMENTATION-PROMPT.md`, approved HTML,
and Sunburst asset provenance under `condition-demo/gen/`. The soft cards and
illustrated palette deliberately follow that approval instead of normal app
chrome. Assets are copied unchanged; no frames were regenerated.

`model.ts` is the deterministic storyboard/hold reducer. Continue becomes available
at 2.2 s for walking targets, 2 s for walking state outside, 2.4 s for walking
state on a treadmill, 2.15 s for gym arrival, 2.4 s for gym presence, and 2.25 s
for gym minutes. These are demo timings, never real detection or grace timers.
Step/minute values come from the draft, and gym name/radius come from settings.

The UI-thread frame callback advances from wall time starting at scene mount;
image decoding never gates playback. All eight canvases stay mounted, with at
most two walking poses visible. Walking time and parallax advance only while
walking, splitting deltas at phase boundaries. React receives phase changes and
at most 10 counter updates per second. The illustrated shield switches directly
from the same snapshot as the person and map. Continuous Conditions have no
app splash or arrival-confirmation delay. Hold to walk switches immediately on
press and release, then resumes the walking phase after 1.2 s stopped.
Backgrounding pauses the clock and releases a hold; unmounting stops playback.
Reduce Motion suppresses pose crossfades, bobbing, and confetti.

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

The seven `demo-*-gated` onboarding proofs check a blocked early Continue and a
successful later Continue. `demo-unlock-haptic` checks the initial lock and unlock
cues. Timed simulator captures, actual taps, and continuous-state transitions are
indexed in `.excer/demo-3s/index.md`. They do not claim native Screen Time or real
motion/location enforcement on a simulator.

New onboarding capability and assets are **new-submission material, never OTA**.

# Scrolling impact sequence

Native review correction: shortened year/free/scrolled beats to 1.8/1.6/3 seconds (6.4 seconds total, previously 14.4). Math Continue appears after 3 seconds. Neutral dots now use the darker comparison token throughout, including the unfilled portion of the final band; orange still means scrolling. These revisions supersede the original pacing/color description below.

Reference: [Unrot on ScreensDesign](https://screensdesign.com/apps/unrot-earn-your-screentime/?id=2334), current recording, 2:40–3:10. Observed the 31-second excerpt and half-second frame strips in `app-next/evidence/unrot-impact/`. The current video is 5:19 long; the page's current embedded recording is ID 3251 even though the provided URL query is 2334.

Observed sequence:

- 2:40–2:43: select 4–6 hours, press Continue. The following calculation uses five hours, the range midpoint.
- 2:43–2:49: outlined card enters. Daily estimate appears first, downward arrow and monthly total follow, then another arrow and yearly days. The conclusion appears below the card before Continue becomes available. Five hours yields 150 hours/month and 76 days/year.
- Around 2:53: Continue slides the math page out; a neutral grid representing one year appears.
- Around 2:56–2:58: most dots fade away, leaving a short band. The text crossfades to explain time remaining after sleep, work, and life admin. There is no user tap between these beats.
- Around 3:01–3:06: text changes to explain scrolling. Remaining dots color progressively in reading order. Scrolling and remaining free time use distinct colors.
- Around 3:07–3:10: concluding copy fades in, followed by Continue.

Implementation: O11 owns the staged math card. O12/O13/O14 keep a single mounted `ImpactDots` tree; stable indices preserve each dot's identity while opacity, scale, vertical position, and color transition. The title reserves its height to prevent the grid jumping when copy wraps. `useImpactPlayback` automatically advances O12/O13, gates O11/O14 Continue, and cancels pending navigation when the route loses focus or unmounts. The footer reserves space while hidden. Reduced motion reveals values immediately and provides manual Continue between the three dot beats.

Logic: days = rounded(hours × 365 / 24), month = hours × 30. Preserve ExcerLock's existing 8-hour daily free-time assumption (122 day-equivalents), which the reference does not disclose numerically. We state that assumption in the UI. Orange dots represent scrolling; peach dots are remaining free time. If scrolling exceeds this allowance, cap colored dots at 122 and explain the overflow; the numeric math still shows the actual estimate. This is illustrative fake-data onboarding, not measured device usage.

Geometry and controls use design tokens; timings live in `timing.ts`, copy in `lib/impactCopy.ts`, pure quantities in `model.ts`. This component uses existing RN/Reanimated APIs. Expo MCP documentation was attempted but its stored OAuth refresh token was rejected; no dependency or native build was added.

