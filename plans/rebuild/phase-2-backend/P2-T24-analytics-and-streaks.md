# P2-T24 — Analytics and streak surfaces

Decisions: B1, B15, B16. Findings: 47, 110, 112. Per-finding detail: `docs/audit/fix-map.md` § P2-T24.
Depends on P2-T15 (persisted history); the UI can be built against the fixture history first so the missing
persistence is visible.

1. **Restore the specified Analytics screen** (47): delta vs previous period, the three stat tiles (days met "N
   of M scheduled", total activity per type, current streak), the estimate baseline on the chart, and the
   no-conditions empty state. Numbers read `historyStore`, not the dev snapshot.
2. **The streak tile is a current streak** (110): `analyticsCopy.current` and `bestEver`; `analyticsModel`
   passes `min(today, periodEnd)` to `streak()` so a past period shows that period's streak. This entry owns
   the literal sweep of `AnalyticsScreen.tsx`.
3. **No time-bank vocabulary** (112): the heading "How you earned time" becomes `analyticsCopy.exercise`.
4. Streak facts (`isMetDay`, the 10-minute state floor, the walking-minutes floor from P2-T16) are read from
   sealed history; a day the app never opened shows as missed.

Tests first: "the delta compares to the previous period"; "the streak tile shows the current streak, not the
period's"; "a missed sealed day breaks the streak in the chart"; "no Analytics string contains 'earned'". Test
files: `features/analytics/__tests__/model.test.ts` and `screen.test.tsx` (the real names).

Acceptance: `02-screen-inventory.md` §A matches; the dev snapshot no longer supplies history.
