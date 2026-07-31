# Analysis milestones

**Contract.** This module owns the fixed 22-badge catalog, its pure shelf
projection, persisted unlock-announcement state, and the Analysis-only
presentation of PRD §3.15 block 6. Metrics enter as plain data; selectors and
catalog code never read a clock or a store.

The three fixed ladders are Streaks (8), Activities (8), and Time Reclaimed
(6). `catalog.ts` statically requires only the accepted plain PNG from
`design/badges/`; an `-opaque.png` correction target is never a render input.
Locked art is the same PNG with a `#7E7781` render-time tint, preserving its
alpha mask and geometry exactly.

`progress.ts` keeps every catalog entry visible. Longest streak determines
which streak badges stay unlocked, while the current streak drives the next
streak ring. Activities and Time Reclaimed are cumulative all-time readings.
Only the first locked badge in each row is `nextUp`.

`ProgressRing.tsx` is the one SVG drawing surface in the shelf. It uses
`react-native-svg` for a continuous, dynamically clipped circular stroke around
the next-up badge and exposes the same fraction as an accessible progressbar.
Static badge art remains PNG; SVG is reserved for the element-level progress
control it is suited to.

`unlockStore.ts` persists one record per discovered badge. `pending` is consumed
once by the next Analysis visit; `isNew` survives that visit and is cleared only
when the badge is tapped. The discovery caller supplies `unlockedAtMs`, which
both preserves the share card's month and keeps time outside every pure read.
`unlockHydration.ts` is the shared AsyncStorage hydration gate: neither live
discovery nor a visit claim can act on an incomplete persisted snapshot.

`useMilestoneUnlockAnimation.ts` owns the visit's single native-driver scale-in
sequence. Pending badges receive stable scale values in catalog order and enter
at `0.62` scale. `useMilestoneUnlockViewport.ts` holds those values until every
row involved in the sequence is materially inside the Analysis viewport, then
starts the completion animation's spring physics, staggered 120 ms apart.
`MilestoneNewGlint.tsx` follows each spring with one clipped diagonal light sweep
over the persistent `New` pill; it does not add a modal announcement surface.
The Analysis route advances the visit key from Expo Router's focus boundary, so
an unlock discovered while the mounted tab is open waits for the next return.
Its initial key is inert; focus itself is the sole production claim trigger,
preventing a mount claim and focus claim from cancelling the first animation.

## Layout

| Path | Responsibility |
|---|---|
| `catalog.ts` | fixed typed ladders and accepted plain-PNG render inputs |
| `progress.ts` | pure complete-shelf projection and next-up readings |
| `ProgressRing.tsx` | dynamic SVG stroke + accessible progress value for each next-up badge |
| `unlockStore.ts` | persisted `pending` / `isNew` announcement lifecycle |
| `unlockHydration.ts` | shared persisted-state readiness gate |
| `MilestoneDiscovery.tsx` | records newly achieved ids only after hydration |
| `LiveMilestoneDiscovery.tsx` | composition-root adapter from real stores/selectors |
| `AnalysisTabIcon.tsx` | pending indicator dot |
| `MilestonesShelf.tsx` | three-row shelf layout and locked/unlocked routing |
| `useMilestoneUnlockViewport.ts` | one-shot release when every target row is materially visible |
| `MilestoneProgressDetail.tsx` | locked-badge progress presentation |
| `MilestoneNewGlint.tsx` | clipped diagonal light sweep over a new badge's pill |
| `useMilestoneShareRequest.ts` | queues an unlocked tap until its persisted timestamp arrives |
| `MilestoneSharePreview.tsx` | privacy-safe projection into the existing share preview |
| `useMilestoneUnlockAnimation.ts` | one staggered scale-in sequence per focused visit |
| `MilestoneHaptics.ts` | vendor-free success-feedback boundary |
| `NativeMilestoneHaptics.ts` | Expo Haptics success-feedback adapter |
| `milestoneHapticsAccessor.ts` | sole production composition root for the native adapter |

`MilestoneHaptics` remains injected at the Analysis screen edge. Production binds
that boundary once through `getMilestoneHaptics()` and `expo-haptics`; the unlock
moment invokes `success()` once only when the visit claims a non-empty pending
sequence. The adapter requests notification-style success feedback and owns no
sound API.

## Simulator judgment — 2026-07-31

Ticket #78 was watched in a production development build on the iOS 26.4
`ExcerLock-E2E` simulator with a deterministic three-day journal. The visit
unlocked `streak-3` and `activity-1` together.

The default unlock moment does **not** read well. Analysis opens at the top of
its scroll view while the milestone shelf is below the fold, so the complete
120 ms staggered scale-in finishes offscreen. By the time the shelf is reached,
the spring sequence is over. The configured damping and stiffness therefore
cannot honestly be called successful as a user-visible moment on this path.

A second recording isolated the motion with a layout-stable three-day fixture.
The shelf was scrolled into frame first; completing the next activity on Home
then crossed `streak-3` and `activity-5` together before returning to Analysis.
Both badges were already full-size in the first visible Analysis frame. The
native animation had run during tab presentation, so neither the stagger nor
the spring was perceptible even with the shelf pre-positioned. This is a timing
and visibility failure, not evidence that the physics need numeric tuning.

The orange `New` treatment is immediately legible on both unlocked badges once
the shelf is reached, but it reads as a persistent label rather than a glint or
shimmer. No popup or share-sheet takeover appeared.

### Ticket #90 verification

The measured cause was the first candidate: the springs started while the shelf
was offscreen or while the Analysis tab was being composited, and finished
before a badge could be seen. The scale values did exist at `0.62` before the
effect, so the claim path was not skipping the from-value. The same unchanged
springs are plainly visible when released in the viewport, so their damping and
stiffness were not the cause.

After the viewport hold and glint sweep were added, a clean Release app was
installed on the pinned iOS 26.4 `ExcerLock-E2E` simulator and the deterministic
recorded-history flow was watched and frame-checked. As the shelf entered the
viewport, `activity-1` was visibly smaller than its final size, then grew to
full size while the adjacent locked badge stayed fixed. The motion was easy to
pick out during the scroll rather than appearing complete in the first visible
frame. A moment later, a bright diagonal band crossed the orange `New` pill;
the changing highlight read as a glint, not only as a label. No popup opened and
no share sheet was presented. The focused watch flow completed successfully.

The simulator cannot establish that tactile feedback feels right on physical
hardware. The native build compiled and linked Expo Haptics; automated tests
cover one success notification for this two-badge sequence and no notification
for an empty visit. Physical-device haptic feel remains unverified.
