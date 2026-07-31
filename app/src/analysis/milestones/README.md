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

`unlockStore.ts` persists one record per discovered badge. `pending` is consumed
once by the next Analysis visit; `isNew` survives that visit and is cleared only
when the badge is tapped. The discovery caller supplies `unlockedAtMs`, which
both preserves the share card's month and keeps time outside every pure read.
`unlockHydration.ts` is the shared AsyncStorage hydration gate: neither live
discovery nor a visit claim can act on an incomplete persisted snapshot.

`useMilestoneUnlockAnimation.ts` owns the visit's single native-driver scale-in
sequence. Pending badges receive stable scale values in catalog order and enter
with the completion animation's spring physics, staggered 120 ms apart.
The Analysis route advances the visit key from Expo Router's focus boundary, so
an unlock discovered while the mounted tab is open waits for the next return.
Its initial key is inert; focus itself is the sole production claim trigger,
preventing a mount claim and focus claim from cancelling the first animation.

## Layout

| Path | Responsibility |
|---|---|
| `catalog.ts` | fixed typed ladders and accepted plain-PNG render inputs |
| `progress.ts` | pure complete-shelf projection and next-up readings |
| `unlockStore.ts` | persisted `pending` / `isNew` announcement lifecycle |
| `unlockHydration.ts` | shared persisted-state readiness gate |
| `MilestoneDiscovery.tsx` | records newly achieved ids only after hydration |
| `LiveMilestoneDiscovery.tsx` | composition-root adapter from real stores/selectors |
| `AnalysisTabIcon.tsx` | pending indicator dot |
| `MilestonesShelf.tsx` | three-row shelf layout and locked/unlocked routing |
| `MilestoneProgressDetail.tsx` | locked-badge progress presentation |
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
