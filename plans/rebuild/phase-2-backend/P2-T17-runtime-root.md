# P2-T17 — Runtime root and enforcement host

Today `applyLock` has no callers, `startProgressSync` is mounted in the tabs layout (it dies with the Home
tab), `useLockDecision` recomputes at 1 Hz for rendering only, and nothing owns the foreground transition.
This task creates the one place that enforces, above every route guard. Decisions: B6, B8, B21. Findings: 9,
29, 46, 66, 80. Per-finding detail: `docs/audit/fix-map.md` § P2-T17. Depends on P2-T14 and P2-T15.

## Composition (`src/runtime/`, README required)

`AppRuntimeProvider` mounts, in this order, above every `Stack.Protected` in `RootNavigator.tsx`:

1. `ErrorBoundary` (finding 46) — a root boundary with a "Something went wrong" screen and a Restart action;
   `toRule` gains a non-throwing `tryRule` so a bad rule never throws at render (Sentry hooks in at P2-T07).
2. `IdentityBridge` (P2-T18's #51) — binds the session's `userId` to the subscription and analytics ports.
3. Haptics binding (finding 80) — `bindHaptics(settingsStore)` so the Touch feedback preference actually
   silences haptics.
4. `EnforcementHost` (finding 9) — a plain `startEnforcement(runtime): Unsubscribe`, not a hook. Owns:
   - the **single** `AppState → 'active'` handler: re-read permission statuses, `describeSelection()` to
     re-verify the handle (P2-T14 §6), run the claim-on-open progress refresh (finding 29, and the
     `lastClaimAt` flag P2-T19 renders), re-evaluate every `clock.at` deadline, then apply;
   - `startProgressSync` (moved out of `app/(tabs)/_layout.tsx`);
   - the session guard: arms P2-T15's `clock.at(windowEnd)` / `clock.at(dayEnd)` teardown and fires
     `stop{ruleChanged}` on rule edits;
   - the enforcement loop: recompute on store changes and on one timer set to `nextEnforcementAt(input)` (the
     earliest of the next interval boundary, `relockAt`, `leaseUntil`, `holdsUntil`), never at 1 Hz; call
     `applyLock(decision, plan)` only when `{ shields, selectionToken, planHash }` changes; run
     `enforcementPlan` first so a lapse clears and unregisters (B21); clamp `now` with `effectiveNow`;
   - the failure channel (finding 66): an `ApplyResult` with `applied: false` publishes
     `enforcementStatus` to the store; Home renders `enforcementFailed` (P2-T19). Fail closed.
5. Route registration outside every guard: `app/locked-apps.tsx` (the third notification id's landing,
   P2-T14 §9) redirecting to Home when entitled and to the paywall modal otherwise.

`useLockDecision` stays a render selector and never calls a port. P2-T04 step 3 is rewritten to name this host.

## Tests first

"the lock is applied while the user is still inside the post-purchase setup sequence, before the tabs exist";
"progress keeps accruing after the tab stack unmounts"; "returning to the foreground re-reads permissions,
re-verifies the selection and re-applies the lock"; "the host applies the lock exactly once per distinct
decision, not once per tick"; "a registration failure leaves shields up and reports applied:false"; "a lapse
clears shields before anything else"; "a window end fires the session teardown at the root"; "the haptics
preference off produces no haptic call"; "a throwing rule renders the boundary, not a blank screen".

## Acceptance

- [ ] `src/runtime/README.md` documents the mount order and the single foreground handler.
- [ ] No second `AppState` subscription exists in `progressSync`, Home or the sheets (grep test).
- [ ] `app-next/app/(tabs)/_layout.tsx` no longer mounts progress sync.
