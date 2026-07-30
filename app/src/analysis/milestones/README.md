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
