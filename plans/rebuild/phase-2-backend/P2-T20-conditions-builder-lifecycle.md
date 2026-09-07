# P2-T20 — Conditions builder and lifecycle

Decisions: B4, B5, B7, B24, B25, B26, B28, B32. Findings: 23, 25, 53, 54, 55, 56, 57, 59, 76, 91, 102.
Per-finding detail: `docs/audit/fix-map.md` § P2-T20. Depends on P2-T16 (the walking branch) and P2-T17
(`tryRule`).

## 1. Gym binding and the end of GPlace (B24, B25; findings 23, 25, 55, 56, 57)

- A gym condition matches **any** saved gym; the mode carries no `placeId`. Stated in `01-product-model.md` §5
  and `02-screen-inventory.md` (G1 support line, SH-gym row).
- The builder's `GPlace` step, its early return in `ConditionBuilder.tsx` and `BuilderGymStep.tsx` are deleted.
  Every builder step has Back, Cancel and a footer. Gym path: O20 → G1 → G2 (time) → S1 → S3.
- `PlanSummary` gets one **Gyms** row: "Any of your N saved gyms" → `/settings/gyms`, or "No gym saved yet ·
  Add a gym" → `/gym-picker` (a route with its own header and Cancel). A gym rule saved with zero gyms is
  stored `enabled: false, pausedReason: 'noGym'`.
- Deleting the last saved gym auto-pauses every gym rule with `pausedReason: 'noGym'` and says so on the row;
  `savePlace` clears it and re-enables (56). Every "add a gym" entry adds a gym: a `placeId` handed to the
  picker comes only from a saved-gym row, never `gyms[gyms.length − 1]` (25).

## 2. Edit flow (findings 53, 54, 59, 102)

Edit is a summary with sub-flows: `editPath(entry, draft)` (pure) walks the real branch from the chosen entry
(Activity row reopens O20; a mode change always shows its goal screen before returning to S3), and
`useBuilder.next()` in edit mode returns to S3 only when the next step is `S1`. `choose()` must preserve `id`,
`createdAt` and `enabled` (today `createDraft` mints a fresh uuid, which would duplicate the rule). When the
chosen window covers `now`, S3 says "Blocking starts as soon as you save" (59). The S3 edit snapshot is
component state on the route, never an unvalidated persisted key (102).

## 3. Window and radius (B26, B32; findings 76, 97 UI half)

The builder's time picker enforces `MIN_WINDOW_MINUTES` from the domain (imported, not restated) with the
copy "Blocking windows are at least 30 minutes". The gym picker keeps the 50–200 m slider and renders the
trade-off line "A wider radius detects arrivals sooner but can trigger next door";
`02-screen-inventory.md:180` ("radius fixed 100 m") is corrected to "slider 50–200 m, default 100 m".

## 4. RuleCard (finding 91)

`RuleCard` gains `status: { text, tone }` from P2-T19's `domain/conditionState.ts` and a paused tone, so the
Conditions list is scannable: "Met today", "Blocking now", "Satisfied by Walk 5,000 steps today", "Paused —
save a gym", "Not scheduled today". Swipe-to-delete on a met rule keeps today's unlock (B23; test).

## Tests first

`features/conditions/__tests__/builder.test.tsx`: "every builder step has Back and Cancel"; "adding a gym from
the summary adds a second gym and never edits the last one"; "a gym rule saved with no gym is paused with a
note"; "deleting the last gym pauses the gym conditions and saving a gym re-enables them"; "editing the mode
shows the new goal screen before the summary"; "changing the activity keeps the rule id"; "a 20-minute window
is refused with the 30-minute copy"; "the picker renders the trade-off line". `RuleCard` snapshot per state.

## Acceptance

- [ ] `builderFlow.ts` has no `GPlace`; `BuilderGymStep.tsx` is gone; inventory rows updated.
- [ ] Editing any field of any rule is possible without delete-and-recreate.
